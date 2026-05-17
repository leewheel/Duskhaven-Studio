/* eslint-disable consistent-return, no-restricted-syntax */

const loadNative = require('./native/loadNative');

const GAME_WINDOW = 'World of Warcraft';
const PROCESS_ACCESS = 0x0410 | 0x0020 | 0x0008 | 0x0010;
const TH32CS_SNAPMODULE = 0x00000008;
const TH32CS_SNAPMODULE32 = 0x00000010;
const INVALID_HANDLE_VALUE = BigInt('-1');
const PAGE_EXECUTE_READWRITE = 0x40;

function asAddress(value) {
  if (Object.prototype.toString.call(value) === '[object BigInt]') return value;
  return BigInt(Number(value) >>> 0);
}

function asNumber(value) {
  return Object.prototype.toString.call(value) === '[object BigInt]' ? Number(value) : value;
}

function createPattern(pattern) {
  if (Buffer.isBuffer(pattern)) {
    return {
      bytes: Array.from(pattern),
      mask: Array.from(pattern).map(() => true),
    };
  }

  const parts = String(pattern).replace(/\s/g, '').match(/.{1,2}/g) || [];
  return {
    bytes: parts.map(part => (part.includes('?') ? 0 : parseInt(part, 16))),
    mask: parts.map(part => !part.includes('?')),
  };
}

function findPatternInBuffer(buffer, pattern, baseAddress) {
  const results = [];
  const lastStart = buffer.length - pattern.bytes.length;

  for (let index = 0; index <= lastStart; index += 1) {
    let matched = true;
    for (let patternIndex = 0; patternIndex < pattern.bytes.length; patternIndex += 1) {
      if (pattern.mask[patternIndex] && buffer[index + patternIndex] !== pattern.bytes[patternIndex]) {
        matched = false;
        break;
      }
    }

    if (matched) results.push(baseAddress + index);
  }

  return results;
}

function createWindowsMemory() {
  const koffi = loadNative('koffi');
  const user32 = koffi.load('user32.dll');
  const kernel32 = koffi.load('kernel32.dll');

  const MODULEENTRY32 = koffi.struct('MODULEENTRY32', {
    dwSize: 'uint32',
    th32ModuleID: 'uint32',
    th32ProcessID: 'uint32',
    GlblcntUsage: 'uint32',
    ProccntUsage: 'uint32',
    modBaseAddr: 'void*',
    modBaseSize: 'uint32',
    hModule: 'void*',
    szModule: 'char[256]',
    szExePath: 'char[260]',
  });

  const enumWindowsProc = koffi.proto('int __stdcall EnumWindowsProc(void* hWnd, int lParam)');
  const enumWindows = user32.func('int __stdcall EnumWindows(EnumWindowsProc* lpEnumFunc, int lParam)');
  const findWindow = user32.func('void* __stdcall FindWindowA(const char* lpClassName, const char* lpWindowName)');
  const getWindowTextA = user32.func('int __stdcall GetWindowTextA(void* hWnd, char* lpString, int nMaxCount)');
  const getWindowThreadProcessId = user32.func('uint32 __stdcall GetWindowThreadProcessId(void* hWnd, _Out_ uint32* lpdwProcessId)');

  const openProcess = kernel32.func('void* __stdcall OpenProcess(uint32 dwDesiredAccess, bool bInheritHandle, uint32 dwProcessId)');
  const closeHandle = kernel32.func('bool __stdcall CloseHandle(void* hObject)');
  const isWow64Process = kernel32.func('bool __stdcall IsWow64Process(void* hProcess, _Out_ bool* Wow64Process)');
  const createToolhelp32Snapshot = kernel32.func('void* __stdcall CreateToolhelp32Snapshot(uint32 dwFlags, uint32 th32ProcessID)');
  const module32First = kernel32.func('bool __stdcall Module32First(void* hSnapshot, _Inout_ MODULEENTRY32* lpme)');
  const module32Next = kernel32.func('bool __stdcall Module32Next(void* hSnapshot, _Inout_ MODULEENTRY32* lpme)');
  const readProcessMemory = kernel32.func('bool __stdcall ReadProcessMemory(void* hProcess, uintptr lpBaseAddress, _Out_ void* lpBuffer, size_t nSize, _Out_ size_t* lpNumberOfBytesRead)');
  const writeProcessMemory = kernel32.func('bool __stdcall WriteProcessMemory(void* hProcess, uintptr lpBaseAddress, const void* lpBuffer, size_t nSize, _Out_ size_t* lpNumberOfBytesWritten)');
  const virtualProtectEx = kernel32.func('bool __stdcall VirtualProtectEx(void* hProcess, uintptr lpAddress, size_t dwSize, uint32 flNewProtect, _Out_ uint32* lpflOldProtect)');
  const flushInstructionCache = kernel32.func('bool __stdcall FlushInstructionCache(void* hProcess, uintptr lpBaseAddress, size_t dwSize)');

  function readWindowTitle(hwnd) {
    const title = Buffer.alloc(512);
    const length = getWindowTextA(hwnd, title, title.length);
    return length ? title.toString('utf8', 0, length) : '';
  }

  function findGameWindow() {
    let hwnd = findWindow(null, GAME_WINDOW);
    if (!hwnd) {
      try {
        const callback = koffi.register((candidateHwnd) => {
          const title = readWindowTitle(candidateHwnd);
          if (title && title.includes(GAME_WINDOW)) {
            hwnd = candidateHwnd;
            return 0;
          }

          return 1;
        }, koffi.pointer(enumWindowsProc));

        enumWindows(callback, 0);
        koffi.unregister(callback);
      } catch (error) {
        hwnd = null;
      }
    }

    if (!hwnd) return null;

    const processId = [0];
    getWindowThreadProcessId(hwnd, processId);
    if (!processId[0]) return null;

    return {
      hwnd,
      processId: processId[0],
      getTitle() {
        return readWindowTitle(hwnd);
      },
    };
  }

  function getMainModule(processId) {
    const snapshot = createToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, processId);
    if (!snapshot || snapshot === INVALID_HANDLE_VALUE) return null;

    try {
      const moduleEntry = { dwSize: koffi.sizeof(MODULEENTRY32) };
      if (!module32First(snapshot, moduleEntry)) return null;

      do {
        if (/\.exe$/i.test(moduleEntry.szModule)) {
          return {
            name: moduleEntry.szModule,
            base: asNumber(moduleEntry.modBaseAddr),
            size: moduleEntry.modBaseSize,
          };
        }
      } while (module32Next(snapshot, moduleEntry));
    } finally {
      closeHandle(snapshot);
    }

    return null;
  }

  function createProcess(handle, processId) {
    return {
      handle,
      processId,
      isValid() {
        return Boolean(handle);
      },
      is64Bit() {
        const wow64 = [false];
        if (!isWow64Process(handle, wow64)) return false;
        return !wow64[0];
      },
      getModules() {
        const module = getMainModule(processId);
        if (!module) return [];
        return [{
          getBase() {
            return module.base;
          },
          getSize() {
            return module.size;
          },
          getName() {
            return module.name;
          },
        }];
      },
    };
  }

  function createMemory(process, moduleBase, moduleSize) {
    function readData(address, buffer, length) {
      const bytesRead = [0];
      const ok = readProcessMemory(process.handle, asAddress(address), buffer, length, bytesRead);
      if (!ok) return false;
      return bytesRead[0] === length;
    }

    function writeData(address, buffer, length) {
      const oldProtection = [0];
      virtualProtectEx(process.handle, asAddress(address), length, PAGE_EXECUTE_READWRITE, oldProtection);

      const bytesWritten = [0];
      const ok = writeProcessMemory(process.handle, asAddress(address), buffer, length, bytesWritten);

      if (oldProtection[0]) {
        const ignored = [0];
        virtualProtectEx(process.handle, asAddress(address), length, oldProtection[0], ignored);
      }

      flushInstructionCache(process.handle, asAddress(address), length);
      return ok && bytesWritten[0] === length;
    }

    function readPtr(address) {
      const buffer = Buffer.alloc(4);
      if (!readData(address, buffer, buffer.byteLength)) return 0;
      return buffer.readUInt32LE(0);
    }

    function scanChunk(start, size, pattern) {
      const buffer = Buffer.alloc(size);
      if (!readData(start, buffer, size)) return [];
      return findPatternInBuffer(buffer, pattern, start);
    }

    function find(patternInput, start) {
      const pattern = createPattern(patternInput);
      if (!pattern.bytes.length) return [];

      const scanStart = moduleBase + Math.max(0, Number(start) || 0);
      const scanEnd = moduleBase + moduleSize;
      const chunkSize = 0x10000;
      const overlap = pattern.bytes.length - 1;
      const results = [];

      for (let address = scanStart; address < scanEnd; address += chunkSize) {
        const size = Math.min(chunkSize + overlap, scanEnd - address);
        results.push(...scanChunk(address, size, pattern));
      }

      return results;
    }

    const memory = {
      readData,
      writeData,
      readPtr,
      find,
    };

    memory.readMultiLevelPtr = (offsets) => {
      let address = moduleBase + Number(offsets[0]);
      for (let index = 1; index < offsets.length; index += 1) {
        address = memory.readPtr(address);
        address += offsets[index];
      }
      return address;
    };

    memory.resolvePtrBySetOfInstruction = (patternBase, build, ptrFix) => {
      const fixByBuild = patternBase.patternFix && patternBase.patternFix[build];
      const patternFix = fixByBuild === undefined ? patternBase.patternFix : fixByBuild;
      const patternPtr = memory.find(patternBase.pattern, 0)[0];
      if (!patternPtr) return;

      const ptrContainer = Buffer.alloc(4);
      memory.readData(patternPtr + patternFix, ptrContainer, ptrContainer.byteLength);
      const ptr = ptrContainer.readUInt32LE(0);

      if (Array.isArray(ptrFix)) {
        return memory.readMultiLevelPtr([ptr - moduleBase].concat(ptrFix));
      }

      return memory.readPtr(ptr + (ptrFix || 0));
    };

    memory.findPattern = pattern => memory.find(pattern, 0);
    memory.findStrPattern = (str) => {
      const searchPattern = Buffer.from(str).toString('hex');
      return memory.find(searchPattern, 0);
    };

    return memory;
  }

  return function initialize(cb) {
    const gameWindow = findGameWindow();
    if (!gameWindow) return cb(new Error('Could not find game window'));

    const handle = openProcess(PROCESS_ACCESS, false, gameWindow.processId);
    const process = createProcess(handle, gameWindow.processId);
    if (!process.isValid()) {
      return cb(new Error('Cannot get process handle. Are you running Duskhaven Studio as administrator?'));
    }

    if (process.is64Bit()) {
      return cb(new Error('64bit process is not supported at the moment'));
    }

    const module = getMainModule(gameWindow.processId);
    if (!module) return cb(new Error('Could not find game module'));

    const memory = createMemory(process, module.base, module.size);
    return cb(null, process, module.base, memory, gameWindow);
  };
}

let initialize;

try {
  initialize = createWindowsMemory();
} catch (error) {
  initialize = cb => cb(error);
}

export default initialize;

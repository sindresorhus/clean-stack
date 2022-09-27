import os from 'node:os';

const homeDirectory = os.homedir().replace(/\\/g, '/');

export default homeDirectory;

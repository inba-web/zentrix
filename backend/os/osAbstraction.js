class OSAbstraction {
  constructor() {
    if (this.constructor === OSAbstraction) {
      throw new Error('OSAbstraction is an abstract class and cannot be instantiated directly.');
    }
  }

  async getSystemMetrics() {
    throw new Error('getSystemMetrics() must be implemented by OS subclass.');
  }

  async getProcesses() {
    throw new Error('getProcesses() must be implemented by OS subclass.');
  }

  async getNetworkConnections() {
    throw new Error('getNetworkConnections() must be implemented by OS subclass.');
  }

  async getSystemLogs() {
    throw new Error('getSystemLogs() must be implemented by OS subclass.');
  }

  async isolateNetwork() {
    throw new Error('isolateNetwork() must be implemented by OS subclass.');
  }

  async restoreNetwork() {
    throw new Error('restoreNetwork() must be implemented by OS subclass.');
  }
}

module.exports = OSAbstraction;

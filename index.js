const path = require("path");
const { spawn } = require("child_process");
const stream = require('stream');

const { Readable } = stream;

class BufferStream extends Readable {
  constructor (buffer) {
    super();
    this.position = 0;
    this.isFinished = false;
    if (Buffer.isBuffer(buffer)) {
      this.buffer = buffer;
    } else {
      throw new Error(`${buffer} is not a Buffer`);
    }
  }

  _read (size) {
    try {
      const currSize = Math.min(size, this.buffer.length - this.position);
      if (currSize > 0) {
        const buf = Buffer.alloc(currSize);
        this.buffer.copy(buf, this.position, 0, currSize);
        this.position += currSize;
        this.push(buf);
      } else {
        this.push(null);
      }
    } catch (err) {
      process.nextTick(() => this.emit('error', err));
    }
    if (!this.isFinished && this.position === this.buffer.length) {
      this.isFinished = true;
      process.nextTick(() => this.emit('finish'));
    }
  }
}

const callScript = (pathToScript, args = [], buffer) => {
  return new Promise((resolve, reject) => {
    const child = spawn(path.resolve(pathToScript), args, {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      serialization: 'advanced',
    });
    child.stdin.write(buffer);
    child.stdin.end();

    let result;
    let error = "";
    child.stdout.on("data", chunk => {
      if (!Buffer.isBuffer(result)) {
        result = Buffer.alloc(0);
      }
      const totalLength = result.length + chunk.length;
      result = Buffer.concat([result, chunk], totalLength);
    });

    child.stderr.on("data", err => {
      error += err;
    });

    child.on("error", err => {
      reject(err);
    });

    child.on("close", code => {
      if (code !== 0) {
        console.error(error);
        reject({ error, code });
      } else {
        resolve(result);
      }
    });
  });
};

const convertWebMToPNG = (buffer) => {
  return callScript('script.sh', [], buffer);
}

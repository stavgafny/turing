// Responsible for how the mechine runs

class Engine {
    // Handles the mechine and connects with DOM elements

    static #runner = null;
    static current = null;

    static print = null;

    static get running() { return this.#runner !== null; }

    static #handlePrint(output) {
        if (output === State.SPECIAL_KEYS.print) {
            if (this.print !== null) {
                console.log(this.print);
                this.print = null;
            } else {
                this.print = "";
            }
        } else if (this.print !== null) {
            this.print += output;
        }
    }

    static #tick() {
        // Next Mechine step If there is a path
        if (!this.current) return;
        // Checks if current is a connection
        if (this.current instanceof Connection) {
            this.current = this.current.queue;
            if (this.current instanceof Procedure) {
                this.current.reset();
            }
            return;
        }

        // Checks if current is a valid queue
        if (!(this.current instanceof Queue)) return;

        // If current is a procedure && if that procedure is still running
        const isRunningProcedure = this.current instanceof Procedure ? !this.current.finished : false;

        // Nexts is queue connections build filtered or procedure operations
        const nexts = isRunningProcedure ?
            this.current.operation : // Operations
            this.current.connections.filter(connection => connection.connected) // Connections
        // All nexts input
        const inputs = nexts.map(next => next.state.input);

        const input = MemoryDOM.cellInput;
        // Tries first to get a specific next input
        // If not found, falls back to "all" next
        let index = inputs.indexOf(input);
        if (index === -1)
            index = inputs.indexOf(State.SPECIAL_KEYS.all)
        const next = nexts[index];
        // If there is no next path (index is still -1)
        if (!next) return Engine.stop();
        const output = (next.state.output === State.SPECIAL_KEYS.all) ?
            input : next.state.output;
        // Converts direction to a number
        const direction = next.state.absoluteDirection;
        MemoryDOM.setNext({ output, direction });
        if (isRunningProcedure)
            this.current.operation = next.queue;
        else
            this.current = next;
        this.#handlePrint(output);
    }

    static run() {
        // Starts runner if runner isn't running
        if (this.running) return;
        this.#runner = Date.now();
        MediaDOM.playPause.classList.add("pause");
    }

    static stop() {
        // Clears runner and set play/pause button state
        this.#runner = null;
        MediaDOM.playPause.classList.remove("pause");
    }

    static reset() {
        this.stop();
        MemoryDOM.init(properties.memory);
        this.current = queues[0];
    }

    static update() {
        let deltatime = Date.now() - this.#runner;
        if (deltatime >= properties.speed) {
            this.#runner += deltatime;
            this.#tick();
        }
    }
}

const buildMemory = expression => {
    /*
        Converts string expression that represents the memory
        Returns the memory size, build order, pointer using that expression context
        EXPRESSION "size@|key : value|key ! value?defaultKey$pointer"
        TYPES [":", "!"] = [absoulte value, jumping value]
        >>> JUMPS OVERRIDE ABSOULTE VALUE <<<
    */
    const ABSOULTE = ":";
    const JUMPS = "!";

    // Validates expression
    // Checks must values: size, defaultKey, pointer are invalid (build is an option not a must like the others)
    const errors = [];
    if (typeof expression !== "string")
        errors.push("\t* Expression must be a string");
    if (expression.indexOf("@") === -1)
        errors.push("\t* Expression must have memory size");
    if (expression.indexOf("?") === -1)
        errors.push("\t* Expression must have a default key");
    if (expression.indexOf("$") === -1)
        errors.push("\t* Expression must define a pointer");

    // If there is at least one error
    if (errors.length > 0) {
        throw new Error("\n" + errors.join("\n"));
    }
    try {
        // Sets size, defaultKey to fill the memory, pointer, build order
        const size = Math.floor(expression.split("@")[0]);
        const [defaultKey, pointer] = expression.split("?")[1].split("$").reduce((a, b) => [a, Math.floor(b)]);
        const build = expression.split("@")[1].split("?")[0].split("|").slice(1, -1);
        // Sets the memory array with default key and seals it so there wont be any leaks
        const output = new Array(size).fill(defaultKey);
        Object.seal(output);
        const jumps = [];
        let index = 0;

        const getLength = value => {
            // Length is the number of times key is called on cells starting from index
            let length = Math.floor(value);
            if (value.endsWith("%")) {
                // Get length in precentage based of total size left (rounds up)
                const precentage = value.slice(0, -1) * 0.01;
                length = Math.round(precentage * (size - index));
            }
            return length;
        }

        const getIndex = value => {
            let _index = Math.floor(value);
            if (value.endsWith("%")) {
                // Get total index precentage from the total size 
                const precentage = value.slice(0, -1) * 0.01;
                _index = Math.floor(precentage * size);
            }
            return _index;
        }

        for (pair of build) {
            // Each pair is a build order that has a key and a value
            // Tries to set cells to key * value from index, Ignores pair if faills
            try {
                if (pair.includes(ABSOULTE)) {
                    // Key : value -> ":" total length value (either precentage or absolute value)
                    const [key, value] = pair.split(":");
                    const length = getLength(value);
                    // If length=-1 run on all left cells except for one
                    if (length > 0) {
                        output.fill(key, index, index + length);
                        index += length;
                    } else if (length <= 0) {
                        output.fill(key, index, length);
                        index = size + length;
                    }
                } else if (pair.includes(JUMPS)) {
                    // Key ! value -> "!" iterates on each value number to put key(jumping)
                    const [key, value] = pair.split("!");
                    const length = getLength(value);
                    if (length > 0) {
                        jumps.push({ key, length, index: index });
                    }
                } else {
                    // If pair is only a number then set index to it, if +/- included then inc/sub to index
                    const _index = getIndex(pair);
                    if (_index !== NaN) {
                        if (pair.includes("+") || pair.includes("-"))
                            index += _index;
                        else
                            index = _index;
                    }
                }
                for (const { key, length, index } of jumps) {
                    for (let i = index + length - 1; i < size; i += length) {
                        output[i] = key;
                    }
                }
            } catch { }
        }
        return { size, pointer, memory: output };
    } catch (e) {
        throw new Error("Invalid expression\n");
    }

}


class IO {

    static save() {
        const procedures = entities.values;
        console.log(procedures);
        const stringified = { properties, queues }
        stringified.queues = JSON.stringify(stringified.queues.map(queue => queue.stringify));
        return JSON.stringify(stringified);
    }

    static load(data) {
        const queues = JSON.parse(data.queues).map(queueData => Queue.parse(queueData));
        queues.map(queue => {
            queue.connections = JSON.parse(queue.connections).map(connection => Connection.parse(connection));
        });
        return { queues };
    }
}
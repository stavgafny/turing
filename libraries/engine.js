// Responsible for how the mechine runs

class Engine {
    // Handles the mechine and connects with DOM elements

    static #stack = [];
    static #runner = null;
    static current = null;

    static print = null;

    static get running() { return this.#runner !== null; }

    static get stackCopy() {
        return Object.assign([], this.#stack);
    }

    static #getMatchingInput(connections) {
        // Gets list of connections
        // Returns the one that matches the current cell input and returns it if one exsists

        // All connections inputs
        const inputs = connections.map(c => c.state.input);
        const input = MemoryDOM.cellInput;
        // Tries first to get a specific connection input
        // If not found, falls back to "all" connection
        let index = inputs.indexOf(input);
        if (index === -1)
            index = inputs.indexOf(State.SPECIAL_KEYS.all)
        return connections[index];
    }

    static #applyStateOutput(state) {
        // Apllies the state output to the memory
        // No output change if connection output is "all" special key
        const output = state.output === State.SPECIAL_KEYS.all ?
            MemoryDOM.cellInput : state.output;
        const direction = state.absoluteDirection;
        MemoryDOM.setNext({ output, direction });
    }

    static #nextConnection() {
        // Next path from connections

        // Gets all filtered connections from in build ones(not connected)
        const connections = this.current.connections.filter(c => c.connected);
        const match = this.#getMatchingInput(connections);
        // If there is no next path(there is no connection found)
        if (!match)
            return Engine.stop();

        // Found a matching connection that input matches current cell input
        // No output change if connection output is "all" special key
        this.#applyStateOutput(match.state);
        this.current = match;
    }

    static #nextInstruction() {
        // Next path from instruction
        
        // Handles procedure connection step
        this.current.connectionStep = !this.current.connectionStep;
        if (this.current.connectionStep) return;

        // Check if current instruction has instructions then it's a procedure(nested procedure)
        const instructions = Procedure.get(this.current.instruction.id);
        if (instructions) {
            this.#stack.push({id : this.current.id, instructionID : this.current.instruction.id});
            this.current.id = this.current.instruction.id;
            this.current.set(instructions);
            this.current.reset();
            // Next instruction on the nested procedure
            return this.#nextInstruction();
        }

        let match = this.#getMatchingInput(this.current.instruction.connections);
        while (!match && this.#stack.length > 0) {
            const {id, instructionID} = this.#stack.pop();
            const instructions = Procedure.get(id);
            this.current.id = id;
            this.current.set(instructions);
            this.current.instruction = instructionID;
            match = this.#getMatchingInput(this.current.instruction.connections);
        }
        if (match) {
            this.#applyStateOutput(match.state);
            this.current.instruction = match.next;
        } else {
            this.current.end();
        }
    }

    static #tick() {
        // Next mechine step
        if (!this.current) return;

        // If currently on connection tick to the connected side
        if (this.current instanceof Connection) {
            this.current = this.current.next;
            if (this.current instanceof Procedure) {
                this.current.reset();
            }
            return;
        }

        // Checks if current is a valid queue / Procedure[sub class of queue]
        if (!(this.current instanceof Queue)) return;

        // If current is a procedure
        if (this.current instanceof Procedure) {
            // If procedure is finished, get the next path from the procedure connections(not from procedure instruction)
            if (this.current.finished) {
                return this.#nextConnection();
            }
            this.#nextInstruction();
        } else {
            // Then it's a queue
            this.#nextConnection();
        }
    }

    static setCurrent(current) {
        /*
        Sets new engine current
        If changed current is a procedure reset it
        If stack isn't empty, reset it and set changed current to it's origin
        */
        if (this.current instanceof Procedure) {
            this.current.reset();
            if (this.#stack.length > 0) {
                const {id, instructionID} = this.#stack[0];
                const instructions = Procedure.get(id);
                this.current.id = id;
                this.current.set(instructions);
                this.current.instruction = instructionID;
                this.#stack = [];
            }
        }
        this.current = current;
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
        this.setCurrent(queues[0]);
    }

    static update() {
        let deltatime = Date.now() - this.#runner;
        if (deltatime >= properties.speed) {
            this.#runner += deltatime;
            this.#tick();
        }
        if (this.current instanceof Procedure && this.running) {
            let inc = 0;
            if (deltatime > properties.speed / 2)
                inc = (deltatime / properties.speed * 2) * 90;
            this.current.progress = this.current.finished ? 0 : inc;
            if (deltatime >= properties.speed || !this.current.connectionStep) {
                this.current.progress = 0;
            }
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


/*
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

*/
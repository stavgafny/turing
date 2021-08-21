// Contains all mechine objects

//class Entity{}

class State {
    // Input is the key that comapers
    // Output is the value that changes the input to
    // Direction moves the stack pointer [ right=true | left=false ]

    static SPLITER = "|";

    static parse(string) {
        const [input, output, direction] = string.split(State.SPLITER);
        return new State({ input, output, direction });
    }

    static get direction() { return { right: "R", left: "L" }; }

    static get SPECIAL_KEYS() {
        return {
            all: "ʘ",
            null: "Ø",
            edge: "├",
            block: "§",
            print: "¥"
        }
    }

    static get DEFAULT() {
        return {
            input: State.SPECIAL_KEYS.all,
            output: State.SPECIAL_KEYS.all,
            direction: State.direction.right
        }
    }

    constructor({ input, output, direction }) {
        this.input = input;
        this.output = output;
        this.direction = direction;
    }

    get absoluteDirection() {
        if (this.direction === State.direction.right)
            return 1;
        else if (this.direction === State.direction.left)
            return -1;
        return 0;
    }

    get stringify() { return `${this.input}${State.SPLITER}${this.output}${State.SPLITER}${this.direction}`; }
}


class Connection {

    static parse(string) {
        let { path, state, queue } = JSON.parse(string);
        path = JSON.parse(path);
        state = State.parse(state);
        queue = getQueueById(queue);
        return { path, state, queue };
    }

    constructor({ x, y }) {
        this.position = { x, y };
        this.state = new State(StateDOM.getState());
        this.path = [{ x, y }];
        this.queue = null;
    }

    get stringify() {
        const path = JSON.stringify(this.path);
        const state = this.state.stringify;
        const queue = this.queue ? this.queue.id : -1;
        return JSON.stringify({ path, state, queue });
    }

    get connected() { return this.queue !== null; }

    get last() { return this.path[this.path.length - 1]; }
}


class Queue {

    static parse(string) {
        let { position, id, connections } = JSON.parse(string);
        position = JSON.parse(position);
        return { position, id, connections };
    }

    static draw({ x, y }) {
        let intersects = false;
        const qs = graphics.sizes.queue;
        const cs = graphics.sizes.connection;
        for (let i = 0; i < queues.length && !intersects; i++) {
            intersects = graphics.overlaps({ x, y }, queues[i].position, qs + qs);
            for (let j = 0; j < queues[i].connections.length && !intersects; j++) {
                const position = queues[i].connections[j].position;
                intersects = graphics.overlaps({ x, y }, position, qs + cs);
            }
        }
        graphics.render.staticQueue({ x, y }, intersects);
        return intersects;
    }


    constructor({ x, y }, id) {
        this.position = { x, y };
        this.id = id;
        this.connections = [];
    }

    get stringify() {
        const position = JSON.stringify(this.position);
        const id = this.id;
        const connections = JSON.stringify(this.connections.map(connection => connection.stringify));
        return JSON.stringify({ position, id, connections });
    }

    get last() { return this.connections[this.connections.length - 1]; }

    get inBuild() { return this.last ? !this.last.connected : false; }

    build({ x, y }) {
        const newConnection = new Connection({ x, y });
        this.connections.push(newConnection);
        return newConnection;
    }

    next({ x, y }) {
        if (this.inBuild) {
            this.last.path.push({ x, y });
        }
    }

    end() {
        return this.last ? (!this.last.connected ? this.connections.pop() : null) : null;
    }

    draw(connectable, isQueue = true) {
        Mouse.deletable(this, graphics.sizes.queue);
        if (isQueue) {
            graphics.render.queue(this);
        } else {
            graphics.render.procedure(this);
        }
        if (connectable) {
            let con = Mouse.pullConnection(this.position, graphics.sizes.queue);
            graphics.render.queueConnectable(con);
            if (con.overlaps) {
                Mouse.onConnection = {
                    queue: this,
                    connection: { x: con.x, y: con.y }
                };
            }
        }
        // Returns if engine current is this queue or a connection of it
        return this === Engine.current || this.connections.indexOf(Engine.current) !== -1;
    }
}


class Procedure extends Queue {

    static draw({ x, y }) {
        let intersects = false;
        const qs = graphics.sizes.queue;
        const cs = graphics.sizes.connection;
        for (let i = 0; i < queues.length && !intersects; i++) {
            intersects = graphics.overlaps({ x, y }, queues[i].position, qs + qs);
            for (let j = 0; j < queues[i].connections.length && !intersects; j++) {
                const position = queues[i].connections[j].position;
                intersects = graphics.overlaps({ x, y }, position, qs + cs);
            }
        }
        graphics.render.staticProcedure({ x, y }, intersects);
        return intersects;
    }

    constructor({ x, y }, id) {
        super({ x, y }, id);
        this.current = 0;
        this.operations = entities.procedures[id];
        this.progress = 0;
    }

    get finished() {
        const inputs = this.operation.map(_operation => _operation.state.input);
        const input = MemoryDOM.cellInput;
        // Returns false if there are no next paths available [ length = 0 or no input match]
        return inputs.indexOf(input) === -1 && inputs.indexOf(State.SPECIAL_KEYS.all) === -1;
    }

    get operation() { return this.operations[this.current]; }

    set operation(value) { this.current = value; }

    reset() {
        this.operation = 0;
    }

    draw(connectable) {
        super.draw(connectable, false);
        this.progress += (this === Engine.current && Engine.running) ? 1 : 0;
        // Returns if engine current is this queue or a connection of it
        return this === Engine.current || this.connections.indexOf(Engine.current) !== -1;
    }
}


const getNewQueueId = () => {
    // If Q0-Q3 then new queue id is Q1 (if there are no jumps then id is queues length)
    const ids = [];
    ids.length = queues.length;
    queues.map(q => ids[q.id] = true);
    let id = null;
    for (let i = 0; i < ids.length && id === null; i++) {
        if (!ids[i]) {
            id = i;
        }
    }
    if (id === null)
        id = queues.length;
    return id;
}


const getQueueById = id => {
    for (let i = 0; i < queues.length; i++) {
        if (queues[i].id === id) {
            return queues[i];
        }
    }
    return null;
}
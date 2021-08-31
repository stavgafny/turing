// Main script, everything is running from here

const CANVAS_HEIGHT_WRAPPER = .88;
const queues = [];
const entities = {
    get identifier() { return "."; },
    get default() { return "queue"; },
    get name() { return window.location.hash.slice(2); /* removes has and identifier at the begining([#.]) */ },
    get current() { return (this.name === this.default) ? Queue : Procedure; },
    set current(value) { window.location.hash = value; },
    procedures: {},
    setProcedure(name) {
        const procedureInstructions = [];
        queues.map(queue => {
            const id = queue instanceof Procedure ? queue.originID : queue.id;
            procedureInstructions.push({
                id,
                connections : queue.connections.map(connection => ({ state: connection.state, next: connection.next.id }))
            });
        });
        this.procedures[name] = procedureInstructions;
    }
};

const properties = {
    speed: 200,
    memory: `200@|${State.SPECIAL_KEYS.edge}:1|0:10|R:1|1:1|?1$1`
};

function setup() {
    createCanvas(window.innerWidth, window.innerHeight * CANVAS_HEIGHT_WRAPPER);
    cursor(CROSS);
    textAlign(CENTER, CENTER);
    textFont("helivna");
    strokeCap(SQUARE);
    rectMode(CENTER);
    angleMode(DEGREES);
    Engine.reset();
    SettingsDOM.speedRange.value = properties.speed;
    entities.current = "";
    entities.current = EntitiesDOM.createEntity(entities.default);
    SettingsDOM.updateSpeedChange();
    ProcedureDOM.update();
    debug().loop();
}

function draw() {
    clear();
    cursor(CROSS);
    Mouse.update();
    graphics.render.background(Mouse.fixed);
    // Checks if one of the queues is/has the engine current
    const hasCurrent = queues.filter(queue => queue.draw(keyIsDown(KEYBINDS.connectionBuild))).length === 1;

    if (keyIsDown(KEYBINDS.queueBuild)) {
        // Queue.draw returns if queue is overlapping
        Mouse.fitQueue = !entities.current.draw(Mouse.position);
    }
    // If there is currently no engine current -> set a new one
    if (!hasCurrent)
        Engine.setCurrent(queues[0]);
    if (Engine.running)
        Engine.update();
}

function debug() {

    return {
        loop : function() {
            Memo.create(queues, new Queue({ x: 200, y: 400 }, queues.length));
            queues[0].build({ x: 280, y: 400 });
            queues[0].next({ x: 520, y: 400 });
            queues[0].connections[0].next = queues[0];
            let c = queues[0].connections.pop();
            Memo.create(queues[0].connections, c);
            ProcedureDOM.name.value = "Debug";
            ProcedureDOM.setProcedure();
            queues.length = 0;
            Memo.create(queues, new Procedure({ x: 200, y: 400 }, "Debug"));
            ProcedureDOM.name.value = "Debugx";
            ProcedureDOM.setProcedure();
            queues.length = 0;
            Memo.create(queues, new Procedure({ x: 200, y: 400 }, "Debugx"));
            ProcedureDOM.name.value = "Debugxs";
            ProcedureDOM.setProcedure();
            queues.length = 0;
            Memo.create(queues, new Procedure({ x: 200, y: 400 }, "Debugxs"));
            ProcedureDOM.name.value = "Debugxss";
            ProcedureDOM.setProcedure();
            queues.length = 0;
            Memo.create(queues, new Procedure({ x: 200, y: 400 }, "Debugxss"));
        },
        nested : function() {
            Memo.create(queues, new Queue({ x: 200, y: 400 }, queues.length));
            Memo.create(queues, new Queue({ x: 600, y: 400 }, queues.length));
            Memo.create(queues, new Queue({ x: 900, y: 400 }, queues.length));
            queues[0].build({ x: 280, y: 400 });
            queues[0].next({ x: 520, y: 400 });
            queues[0].connections[0].next = queues[1];
            let c = queues[0].connections.pop();
            c.state.output = "M";
            Memo.create(queues[0].connections, c);
            queues[1].build({ x: 680, y: 400 });
            queues[1].next({ x: 820, y: 400 });
            queues[1].connections[0].next = queues[2];
            c = queues[1].connections.pop();
            c.state.output = "D";
            Memo.create(queues[1].connections, c);
            ProcedureDOM.name.value = "Debug";
            ProcedureDOM.setProcedure();
            queues.length = 0;
            Memo.create(queues, new Queue({ x: 200, y: 100 }, queues.length));
            Memo.create(queues, new Procedure({ x: 200, y: 400 }, "Debug"));
            Memo.create(queues, new Procedure({ x: 700, y: 400 }, "Debug"));
            c = new Connection({x : 280, y : 100});
            c.path.push({x : 200, y : 320});
            c.next = queues[1];
            c.state.output = "F";
            c.position = c.path[0];
            Memo.create(queues[0].connections, c);
            c = new Connection({x : 280, y : 400});
            c.path.push({x : 620, y : 400});
            c.next = queues[2];
            c.state.output = "A";
            c.position = c.path[0];
            Memo.create(queues[1].connections, c);
            ProcedureDOM.name.value = "Xdebug";
            ProcedureDOM.setProcedure();
            queues.length = 0;
            Memo.create(queues, new Procedure({ x: 200, y: 400 }, "Xdebug"));
        }
    }
}
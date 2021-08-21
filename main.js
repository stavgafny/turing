// Main script, everything is running from here
const CANVAS_HEIGHT_WRAPPER = .88;
const queues = [];
const entities = {
    get default() { return "queue"; },
    get name() { return window.location.hash.slice(1); },
    get current() { return (this.name === this.default) ? Queue : Procedure; },
    set current(value) { window.location.hash = value; },
    procedures: {
        "debug": {
            0: [
                { state: new State(State.DEFAULT), queue: 0 },
                { state: new State({ input: "1", output: "A", direction: "R" }), queue: 1 }
            ],
            1: [
                { state: new State({ input: State.SPECIAL_KEYS.all, output: "C", direction: "R" }), queue: 2 }
            ],
            2: [
                { state: new State({ input: State.SPECIAL_KEYS.edge, output: "a", direction: "R" }), queue: 0 }
            ]
        }
    }
};

const properties = {
    speed: 50,
    memory: `200@|3:1|0:2|1:1|?1$1`
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
    SettingsDOM.handleSpeedChange();
    //entities.current = entities.default;

    // return ;// Debug
    Memo.create(queues, new Queue({ x: 200, y: 400 }, queues.length));
    Memo.create(queues, new Procedure({ x: 600, y: 400 }, "debug"));
    queues[0].build({ x: 280, y: 400 });
    queues[0].next({ x: 520, y: 400 });
    queues[0].connections[0].queue = queues[1];
    const c = queues[0].connections.pop();
    Memo.create(queues[0].connections, c);

    //console.log(IO.save());

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
        Engine.current = queues[0];
    if (Engine.running)
        Engine.update();
}
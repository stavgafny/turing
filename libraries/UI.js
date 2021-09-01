// Responsible to all user interactions with the program
const SHIFT_KEY = 16;
const CNTRL_KEY = 17;
const ALT_KEY = 18;
const ESCAPE_KEY = 27;
const SPACE_KEY = 32;
const X_KEY = 88;
const Z_KEY = 90;
const TILDE_KEY = 192;
const MOUSE_CLICK = { left: 0, middle: 1, right: 2 };


const KEYBINDS = {
    gridToggle: MOUSE_CLICK.middle,
    queueBuild: SHIFT_KEY,
    connectionBuild: CNTRL_KEY,
    delete: ALT_KEY,
    undo: Z_KEY,
    redo: X_KEY,
    playPause: SPACE_KEY
}

const STATE_KEYS = {};
STATE_KEYS[ESCAPE_KEY] = "all";
STATE_KEYS[CNTRL_KEY] = "null";
STATE_KEYS[SHIFT_KEY] = "print";
STATE_KEYS[ALT_KEY] = "block";
STATE_KEYS[TILDE_KEY] = "edge";

const GRID = {
    size: 20,
    dotSize: 4
};

let buildConnection = null;

class Mouse {
    // Responsible to all mouse releated things

    static fixed = false; // Grid

    static fitQueue = false; // Can a queue spawn

    static onConnection = null; // Hovered connection

    static onDelete = null; // Hovered object on delete key

    static update() {
        // Updates mouse current state
        this.fitQueue = false;
        this.onConnection = null;
        this.onDelete = null;
    }

    static deletable(obj, size) {
        // Checks if given object is hovered using given size
        // If hovered and delete key is pressed then store object
        if (keyIsDown(KEYBINDS.delete) && !this.onDelete) {
            if (graphics.overlaps(obj.position, this.position, size)) {
                this.onDelete = obj;
            }
        }
    }

    static get position() {
        // Returns mouse absolute/fixed position based on fixed(true/false)
        if (this.fixed)
            return {
                x: Math.floor(mouseX / GRID.size) * GRID.size,
                y: Math.floor(mouseY / GRID.size) * GRID.size
            };
        return { x: mouseX, y: mouseY };
    }

    static pullConnection({ x, y }, r) {
        // Gets position and radius
        // Returns the closest position to mouse in radius
        const m = this.position;
        const v = { x: (m.x - x), y: (m.y - y) };
        v.v = sqrt(v.x ** 2 + v.y ** 2);
        const output = {
            x: x + (v.x / v.v * r),
            y: y + (v.y / v.v * r)
        };
        const radius = buildConnection ? graphics.sizes.connecting : graphics.sizes.connection;
        output.overlaps = graphics.overlaps(m, output, radius);
        return output;
    }

}

function windowResized() {
    resizeCanvas(window.innerWidth, window.innerHeight * CANVAS_HEIGHT_WRAPPER);
}

function mousePressed(e) {
    StateDOM.clear();

    if (e.button === KEYBINDS.gridToggle) { return Mouse.fixed = !Mouse.fixed; }

    if (e.button === MOUSE_CLICK.right) return;

    if (Mouse.onDelete) {
        // Deletes object[queue/connection]
        Memo.delete(Mouse.onDelete);
        return;
    }

    if (Mouse.fitQueue) {
        // Creates a new queue/procedure
        const id = (entities.name === entities.default) ? getNewQueueId() : entities.name;
        Memo.create(queues, new entities.current(Mouse.position, id));
        return;
    }

    if (buildConnection) {
        if (Mouse.onConnection) {
            /*
            If connection in build and pressed on another connection then it's the connected side 
            Makes connection arrow to connect properly by aiming to the connected
            queue center and making a gap 1.5 times the size of the arrow.
            Connects connection to queue and setting the path to it
            */
            const { queue, connection } = Mouse.onConnection;
            // Get angle to the center of the queue(aim arrow)
            const angle = graphics.getAngle(connection, queue.position);
            const connectionShorted = {
                x: connection.x + graphics.sizes.connection * angle.x * 1.5,
                y: connection.y + graphics.sizes.connection * angle.y * 1.5,
            };
            buildConnection.queue.next(connectionShorted);
            buildConnection.queue.next(connection);
            buildConnection.connection.next = queue;
            // Re-adding object again using Memo to save changes(undo/redo)
            buildConnection.queue.connections.pop();
            Memo.create(buildConnection.queue.connections, buildConnection.connection)
            buildConnection = null;
            return;
        }
        // If on connection on build but not on connected then add connection next path
        buildConnection.queue.next(Mouse.position);
        return;
    }

    if (keyIsDown(KEYBINDS.connectionBuild) && Mouse.onConnection) {
        // If connection key is pressed and mouse hovers a connection and not buildConnection(checked previously)
        // Build a connection and set to in build
        const { queue, connection } = Mouse.onConnection;
        buildConnection = {
            queue: queue,
            connection: queue.build(connection)
        };
        return;
    }

}

function keyPressed(e) {
    if (e.keyCode === ALT_KEY) e.preventDefault();
    if (e.keyCode === ESCAPE_KEY && !StateDOM.onEdit) SettingsDOM.toggleSettings();

    if (StateDOM.handleKeyInput(e.keyCode)) return;
    if (document.activeElement === MediaDOM.procedureName || document.activeElement === ProcedureDOM.name) return;

    if (e.keyCode === KEYBINDS.playPause) return MediaDOM.playPause.click();
    if (e.keyCode === KEYBINDS.undo) return MediaDOM.callUndo();
    if (e.keyCode === KEYBINDS.redo) return MediaDOM.callRedo();
}

function keyReleased(e) {
    if (e.keyCode === KEYBINDS.connectionBuild && buildConnection) {
        // If connection key released and connection in build, clear buildConnection either way(connected or not)
        if (!buildConnection.connection.connected)
            // If connection isn't connected(still in build) remove it
            buildConnection.queue.connections.pop();
        buildConnection = null;
    }
}

document.addEventListener("contextmenu", event => event.preventDefault());
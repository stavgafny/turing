// Represents the program graphically. Draws on the canvas with defined sizes and colors

const graphics = (function () {

    const colors = {
        background: "#5a5d60",
        grid: "#00000044",
        queue: "#ddd",
        connection: "#333",
        connectionHover: "#abc",
        arrow: "#000",
        buildArrow: "#aaa",
        intersects: "#faa",
        notIntersects: "#ada",
        delete: "#f76",
        procedureAlive : "#9da",
        procedureFinished : "#50000099",
        procedureConnectionStep : "#bdf",
        get current() { return Engine.running ? "#44e" : "#124"; }
    };

    const sizes = {
        queue: 80,
        connection: 22,
        connecting: 10,
        arrowStroke: 3,
        arrowTriangle: 8,
        arrowPointer: 24,
        current: 6
    };

    const drawConnections = queue => {
        // Draws all connections of a given queue
        // Checks each connection, color based of deleteable (mouse hovers and delete key is pressed)
        queue.connections.map(con => {
            drawConnectionPath(con);
            Mouse.deletable(con, sizes.connection);
            const { x, y } = con.position;
            push();
            noStroke();
            fill(Mouse.onDelete === con ? colors.delete :
                (con === Engine.current) ? colors.current : colors.connection);
            ellipse(x, y, sizes.connection * 2);
            fill(255);
            textSize(sizes.connection * .65);
            text(con.state.stringify, x, y);
            pop();
        });
    };

    const drawConnectionPath = build => {
        // Draws connection path
        const { x, y } = build.last;
        // If not connected(in build) only sub length by one because point 2 is mouse position
        const length = build.path.length - (1 * build.connected ? 2 : 1);
        let color = (build === Engine.current) ? colors.current : colors.arrow;
        push();
        strokeWeight(sizes.arrowStroke);
        stroke(color);
        for (let i = 0; i < length; i++) {
            line(
                build.path[i].x,
                build.path[i].y,
                build.path[i + 1].x,
                build.path[i + 1].y
            );
        }
        // If not connected(in build) last path is last point and mouse position
        // Else last path = two last points
        let p1 = { x, y };
        let p2 = Mouse.position;
        if (build.connected) {
            p1 = build.path[build.path.length - 2];
            p2 = { x, y };
        }
        if (!build.connected) {
            stroke(colors.buildArrow);
            fill(colors.buildArrow);
        } else {
            stroke(color);
            fill(color);
        }
        drawConnectionArrow(p1, p2);
        pop();
    };

    const drawConnectionArrow = (p1, p2) => {
        // Draws last path and arrow, color is based of connection in build
        if (dist(p1.x, p1.y, p2.x, p2.y) <= 0) return;
        const angle = exports.getAngle(p1, p2);
        const v = sizes.arrowTriangle;
        const vp = sizes.arrowPointer;
        const sub = {
            x: vp * angle.x,
            y: vp * angle.y
        };
        push();
        // Last path
        line(p1.x, p1.y, p2.x + sub.x, p2.y + sub.y);
        // Triangle
        translate(p2.x + sub.x, p2.y + sub.y);
        rotate(angle.value);
        noStroke();
        triangle(0, v, 0, -v, -vp, 0);
        pop();
    };

    const exports = {
        // All public variables and function on graphics (vector calculations, rendering)

        sizes: sizes,
        // Checks if two points are overlapping each other on a given sum radius
        // 2 queues -> r = queue_radius * 2, queue and connection -> r = queue_radius + connection_radius
        overlaps: (a, b, r) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r ** 2,

        // Gets two points and returns angle between them + x/y vector increments of angle
        getAngle: (p1, p2) => {
            const angle = createVector(p1.x - p2.x, p1.y - p2.y).heading();
            return {
                value: angle,
                x: cos(angle),
                y: sin(angle)
            };
        },

        render: {
            // Render object returns functions that affect the canvas

            background: fixedGrid => {
                // Draws background and grid if enabled
                push();
                background(colors.background);
                pop();
                if (!fixedGrid) return;
                push();
                noStroke();
                fill(colors.grid);
                for (let y = 1; y < height / GRID.size; y++) {
                    for (let x = 1; x < width / GRID.size; x++) {
                        ellipse(x * GRID.size, y * GRID.size, GRID.dotSize);
                    }
                }
                pop();
            },

            staticQueue: ({ x, y }, intersects) => {
                // Draw queue minimal
                push();
                noStroke();
                fill(intersects ? colors.intersects : colors.notIntersects);
                ellipse(x, y, sizes.queue * 2);
                pop();
            },

            staticProcedure: ({ x, y }, intersects) => {
                // Draw procedure
                const value = Math.sqrt(2) * sizes.queue;
                push();
                translate(x, y);
                noStroke();
                fill(intersects ? colors.intersects : colors.notIntersects);
                ellipse(0, 0, sizes.queue * 2);
                stroke(0);
                noFill();
                ellipse(0, 0, value);
                rect(0, 0, value, value, 10);
                pop();
            },

            queue: queue => {
                // Draw queue object
                const { x, y } = queue.position;
                push();
                // Queue
                translate(x, y);
                if (queue === Engine.current) {
                    strokeWeight(sizes.current);
                    stroke(colors.current);
                } else {
                    noStroke();
                }
                fill(Mouse.onDelete === queue ? colors.delete : colors.queue);
                ellipse(0, 0, sizes.queue * 2);
                noStroke();
                // Text
                fill(0);
                textSize(sizes.queue * .75);
                text('q', 0, 0);
                // Number
                fill(80);
                textSize(sizes.queue / 3);
                text(queue.id, textWidth('q') + textWidth(queue.id) / 2, sizes.queue / 4);
                pop();
                // All queue connections
                drawConnections(queue);
            },

            procedure: procedure => {
                const { x, y } = procedure.position;
                const value = Math.sqrt(2) * sizes.queue;
                let nested = [];
                if (procedure === Engine.current) {
                    nested = Engine.stackCopy;
                }
                push();
                // procedure
                translate(x, y);
                fill(Mouse.onDelete === procedure ? colors.delete : colors.queue);
                if (procedure === Engine.current) {
                    strokeWeight(sizes.current);
                    stroke(colors.current);
                } else {
                    stroke(0);
                }
                ellipse(0, 0, sizes.queue * 2);
                strokeWeight(sizes.current / 3);
                stroke(0);
                push();
                rotate(procedure.progress);
                fill(procedure.finished ? colors.procedureFinished : procedure.connectionStep ? colors.procedureConnectionStep : colors.procedureAlive);
              
                rect(0, 0, value, value, 10);
                pop();
                ellipse(0, 0, value);
                noStroke();
                textFont("arial");
                fill(0);
                textSize(sizes.queue / Math.sqrt(procedure.name.length * 2));
                text(procedure.name, 0, 0);
                textSize(30);
                let m = "";
                for (let i = 0; i < nested.length; i++) m += ".";
                text(m, 0, -30);
                textSize(16);
                const instructionID = procedure.instruction.id;
                const id = isNaN(int(instructionID)) ?
                instructionID.split(Procedure.identifier)[0] :
                "q" + instructionID;
                text(id, 0, 18);
                pop();
                // All procedure connections
                drawConnections(procedure);
            },

            queueConnectable: ({ x, y, overlaps }) => {
                // Gets connection position and if overlapping
                // Draws connection with size and color based of overlaps
                let radius = buildConnection ? sizes.connecting : sizes.connection;
                push();
                noStroke();
                fill(overlaps ? colors.connectionHover : colors.connection);
                ellipse(x, y, radius * 2);
                pop();
            }
        }
    };
    return exports;
})();
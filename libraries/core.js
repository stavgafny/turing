// Core

class Memo {
    // Responsible to all temporary changes made on the mechine
    // Operations -> spawn/delete a queue/connection, undo, redo
    // Each push to #undo/#redo is a list that contains all changes.

    static #CREATE = true; static #DELETE = false; // Type

    static #undo = [];
    static #redo = [];

    static #FORMAT = (list, obj, type) => ({ list, obj, type });

    static #push(data) {
        // Push new change in data, reset redo and set in undo, refresh undo-redo buttons and stop the engine
        this.#undo.push(data);
        this.#redo = [];
        MediaDOM.refreshUndoRedo();
        Engine.stop();        
    }

    static hasUndo() { return this.#undo.length > 0; }
    static hasRedo() { return this.#redo.length > 0; }

    static #handleSave = operator => {
        // If operator is undo then create last change else if it's redo then delete last change
        // Save last change to the oppsite of operator, example: popped from undo, saved in redo 
        const save = operator.pop();
        // If there is no undo/redo left return false
        if (!save) return false;
        save.map(({ list, obj, type }) => {
            if (operator === this.#undo ? type === this.#CREATE : type === this.#DELETE) {
                let index = list.indexOf(obj);
                if (index !== -1) {
                    list.splice(index, 1);
                }
            } else {
                list.push(obj);
            }
        });
        // Oppsite of operator
        (operator === this.#undo ? this.#redo : this.#undo).push(save);
        return true;
    }

    static create(list, obj) {
        // Spawns object(queue/connection) and push it
        list.push(obj);
        this.#push([this.#FORMAT(list, obj, this.#CREATE)]);
    }

    static delete(obj) {
        /*
        Deletes object(queue/connection) and push it
        Removes object from queues if found, else object is a connection
        If object is a connection. finds connection in one of the queues and removes it
        If object is a queue, removes all connections connected to that queue
        Pushes to #undo a list{save} of all changes(in the case of connections connected to deleted queue)
        */
        const save = [];
        let index = queues.indexOf(obj);
        if (index !== -1) {
            queues.splice(index, 1);
            save.push(this.#FORMAT(queues, obj, this.#DELETE));

            // Check if other queues were connected to deleted queue
            queues.map(queue => {
                const filteredConnections = queue.connections.filter(connection => {
                    if (connection.next === obj) {
                        save.push(this.#FORMAT(queue.connections, connection, this.#DELETE));
                    } else {
                        return connection;
                    }
                });
                // Filters queue connections by removing all connections connected to deleted queue
                queue.connections.length = 0;
                queue.connections.push(...filteredConnections);
            });

        } else {
            // If object not found in queues then it is a connection
            // Searches for the connection in all the queues and stops once it finds it
            let queue;
            for (let i = 0; i < queues.length && index === -1; i++) {
                queue = queues[i];
                index = queue.connections.indexOf(obj);
            }
            if (index !== -1) {
                queue.connections.splice(index, 1);
                save.push(this.#FORMAT(queue.connections, obj, this.#DELETE));
            }
        }
        this.#push(save);
    }

    static clear() {
        // Clear all queues
        const save = [];
        queues.map(queue => {
            save.push(this.#FORMAT(queues, queue, this.#DELETE));
        });
        queues.length = 0;
        this.#push(save);
    }

    static undo() {
        return this.#handleSave(this.#undo);
    }

    static redo() {
        return this.#handleSave(this.#redo);
    }
}


function toProcedure() {
    const procedureInstructions = [];
    queues.map(queue => {
        const id = queue instanceof Procedure ? queue.originID : queue.id;
        procedureInstructions.push({
            id,
            connections: queue.connections.map(connection => ({ state: connection.state, next: connection.next.id }))
        });
    });
    return procedureInstructions;
}
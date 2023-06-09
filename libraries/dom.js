// Handles all the dom elements and structures to the engine

class MemoryDOM {
    // Structures HTML memory element

    static #index = document.getElementById("memory_index");
    static #size = document.getElementById("memory_size");
    static #cells = document.getElementById("cells");
    static #pointerClass = "pointer";

    static get pointer() { return Math.floor(this.#index.innerText); }

    static get cell() { return this.#cells.children[this.pointer]; }

    static get cellInput() { return this.cell.innerText; }

    static set #pointer(value) {
        if (this.cell) {
            // Unset old cell
            this.cell.classList.remove(this.#pointerClass);
        }
        // Set as new current cell
        this.#index.innerText = value;
        this.cell.classList.add(this.#pointerClass);
        // Focus on current cell
        this.cell.scrollIntoView({
            behavior: "auto",
            block: "center",
            inline: "center"
        });
    }

    static #clear() {
        this.#cells.innerHTML = "";
    }

    static init(expression) {
        // Initializing the memory size, cells, pointer using the expression

        // Builds the memory using the build expression and the size on properties
        try {
            const { size, pointer, memory } = buildMemory(expression);
            this.#clear();
            for (let i = 0; i < size; i++) {
                const element = document.createElement("li");
                element.innerText = memory[i];
                this.#cells.appendChild(element);
            }
            this.#size.innerText = size;
            this.#pointer = pointer;
        } catch (e) {
            alert(e.message);
            return;
        }
    }

    static setNext({ output, direction }) {
        // Sets new pointer if valid
        this.cell.innerText = output;
        const nextIndex = this.pointer + direction;
        if (nextIndex < this.#cells.children.length && nextIndex >= 0)
            this.#pointer = nextIndex;
    }

}


class MediaDOM {
    // All media control

    static #undoRedoAvailable = "available";
    static #undoRedoActivation = "activated";

    static playPause = document.getElementById("play_pause");
    static reset = document.getElementById("reset");
    static undo = document.getElementById("undo");
    static redo = document.getElementById("redo");

    static #handleUndoRedo = (dom, method) => {
        // Gets DOM element and undo/redo method
        // Effacts DOM element if there was an undo/redo method then
        if (!method)
            return false;
        dom.classList.add(this.#undoRedoActivation);
        setTimeout(() => dom.classList.remove(this.#undoRedoActivation), 0);
        this.refreshUndoRedo();
        return true;
    }

    static refreshUndoRedo() {
        this.undo.classList.toggle(this.#undoRedoAvailable, Memo.hasUndo());
        this.redo.classList.toggle(this.#undoRedoAvailable, Memo.hasRedo());
    }

    static callUndo() {
        if (this.#handleUndoRedo(this.undo, Memo.undo()))
            Engine.stop();
    }

    static callRedo() {
        if (this.#handleUndoRedo(this.redo, Memo.redo()))
            Engine.stop();
    }
}


class StateDOM {
    // Structures HTML state element

    static #INPUT = 0; static #OUTPUT = 1; static #DIRECTION = 2;
    static #tester = /^[A-Za-z0-9]*$/;
    static #dom = document.getElementById("state");

    // Setting state elements
    static input = this.#dom.children[this.#INPUT];
    static output = this.#dom.children[this.#OUTPUT];
    static direction = this.#dom.children[this.#DIRECTION];
    static setter = "set-state";

    static get onEdit() {
        return this.input.classList.contains(this.setter) || this.output.classList.contains(this.setter);
    }

    static clear() {
        this.input.classList.remove(this.setter);
        this.output.classList.remove(this.setter);
    }

    static handleKeyInput(key) {
        // Changing state(either input or output) keys if they are in "set_state"
        let element = this.input.classList.contains(this.setter) ? this.input : null;
        if (!element) element = this.output.classList.contains(this.setter) ? this.output : null;
        if (element) {
            const specialKey = State.SPECIAL_KEYS[STATE_KEYS[key]];
            if (specialKey) {
                element.children[0].innerText = specialKey;
            } else if (this.#tester.test(char(key))) {
                element.children[0].innerText = char(key);
            } else {
                return false;
            }
            element.classList.remove(this.setter);
            return true;
        }
        return false;
    }

    static getState() {
        return {
            input: this.input.innerText,
            output: this.output.innerText,
            direction: this.direction.innerText
        };
    }
}


class ProcedureDOM {
    // Procedure edits

    static #tester = /^[A-Za-z0-9]*$/;
    static #setUpdate = "update";
    
    static name = document.getElementById("procedure_name");
    static set = document.getElementById("procedure_set");
    static del = document.getElementById("procedure_del");

    static get #validName() {
        // Must: not be empty, only alphabet and numbers starting with a letter, queues aren't empty, not default entity [queue]
        return this.value.length > 0 && isNaN(int(this.value)) && this.value !== entities.default &&
        this.#tester.test(this.value) && queues.length > 0;
    }

    static get value() { return this.name.value; }

    static get onUpdate() {
        const exsists = !!entities.procedures[this.value];
        return !this.set.disabled && exsists;
    }

    static update() {
        // Updates buttons according the given name
        const exsists = !!entities.procedures[this.value];
        this.set.disabled = !this.#validName;
        this.set.classList.toggle(this.#setUpdate, this.onUpdate);
    }

    static setProcedure() {
        // Set procedure

        if (!entities.procedures[this.value]) {
            // If no procedure -> no entity, create one
            EntitiesDOM.createEntity(this.value);
        }
        // Set procedure
        entities.setProcedure(this.value);
        // Clear
        this.name.value = "";
        // Update
        this.update();
    }

    static deleteProcedure() {
        // Delete procedure
        delete entities.procedures[entities.name];
        EntitiesDOM.deleteEntity(entities.name);
        this.update();
    }
}


class EntitiesDOM {

    static #dom = document.getElementById("entities");

    static createEntity(name) {
        const entity = document.createElement("button");
        entity.id = entities.identifier + name;
        entity.innerText = name;
        entity.onmousedown = function () { entities.current = this.id; };
        this.#dom.appendChild(entity);
        return entity.id;
    }

    static deleteEntity(name) {
        const entity = document.getElementById(entities.identifier + name);
        if (entity) {
            this.#dom.removeChild(entity);
        }
        if (entities.name === name) {
            // Deleted current entity, set entity to default [queue]
            entities.current = entities.identifier + entities.default;
        }
    }
}


class SettingsDOM {
    // Settings window

    static #display = "display";

    static settingsWindow = document.getElementById("settings");
    static speedRange = document.getElementById("speed");
    static speedTracker = document.getElementById("speed_tracker");
    static memoryPrompt = document.getElementById("memory_prompt");
    static memoryButton = document.getElementById("memory_button");

    static get displayed() { return this.settingsWindow.classList.contains(this.#display); }

    static #windowDisplayMode(mode) {
        const children = this.settingsWindow.children;
        for (let i = 0; i < children.length; i++) {
            const element = children[i];
            element.disabled = !mode;
        }
        this.settingsWindow.classList.toggle(this.#display, mode);
    }

    static toggleSettings(force = !this.displayed) {
        this.#windowDisplayMode(force);
    }

    static updateSpeedChange() {
        properties.speed = this.speedRange.value;
        this.speedTracker.innerText = properties.speed + "ms";
    }

}


function updateDOMOnQueueChange() {
    if (queues.length <= 1) {
        // If queues are/were empty
        ProcedureDOM.update();
        clearButton.disabled = !(queues.length > 0);
    }
}


// Set floating buttons(with no clear structure)
const clearButton = document.getElementById("clear_button");
const settingsButton = document.getElementById("settings_button");

// Binds elements
clearButton.onclick = function() { Memo.clear(); }
MediaDOM.playPause.onclick = function () { Engine.running ? Engine.stop() : Engine.run(); this.blur(); }
MediaDOM.reset.onclick = function () { Engine.reset(); this.blur(); queues.map(q => q instanceof Procedure ? q.reset() : null) }
MediaDOM.undo.onclick = function () { MediaDOM.callUndo(); }
MediaDOM.redo.onclick = function () { MediaDOM.callRedo(); }
StateDOM.input.children[0].innerText = State.SPECIAL_KEYS.all;
StateDOM.output.children[0].innerText = State.SPECIAL_KEYS.all;
StateDOM.direction.children[0].innerText = State.direction.right;
StateDOM.input.onclick = function () { this.classList.add(StateDOM.setter); StateDOM.output.classList.remove(StateDOM.setter); }
StateDOM.output.onclick = function () { this.classList.add(StateDOM.setter); StateDOM.input.classList.remove(StateDOM.setter); }
StateDOM.direction.onclick = function () { this.children[0].innerText = (this.children[0].innerText === 'R') ? 'L' : 'R'; }
ProcedureDOM.name.oninput = function() { ProcedureDOM.update(); }
ProcedureDOM.set.onclick = function() { ProcedureDOM.setProcedure(); }
ProcedureDOM.del.onclick = function() { ProcedureDOM.deleteProcedure(); }
settingsButton.onclick = function () { SettingsDOM.toggleSettings(); }
SettingsDOM.speedRange.oninput = function () { SettingsDOM.updateSpeedChange(); }
SettingsDOM.memoryPrompt.oninput = function() {
    try {
        buildMemory(this.value);
        this.classList.remove("error");
    } catch (e) {
       this.classList.add("error");
    }
}
SettingsDOM.memoryButton.onclick = function() {
    properties.memory = SettingsDOM.memoryPrompt.value;
    Engine.reset();
}
const specialKeys = document.getElementById("special_keys");
const KEYS = {
    "all": "Esc",
    "null": "Ctrl",
    "print": "Shift",
    "block": "Alt",
    "edge": "Tilde"
}
for (const [key, value] of Object.entries(State.SPECIAL_KEYS)) {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "5px";

    const span = document.createElement("span");
    span.innerText = `${key}`;

    div.appendChild(span);

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    const button = document.createElement("button");
    button.innerText = value;

    const tooltiptext = document.createElement("p");
    tooltiptext.className = "tooltiptext";
    tooltiptext.innerText = "Copy";
    tooltiptext.style.color = "#fff";

    button.onclick = function() {
        navigator.clipboard.writeText(value);
        tooltiptext.innerText = "Copied";
    }

    button.onmouseout = function() {
        tooltiptext.innerText = "Copy";
    }
    
    button.appendChild(tooltiptext);
    tooltip.appendChild(button);
    div.appendChild(tooltip);


    const kbd = document.createElement("kbd");
    kbd.innerText = KEYS[key];

    div.appendChild(kbd);



    specialKeys.appendChild(div);
}
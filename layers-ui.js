var LayerUI, LayerView;

LayerUI = function (painter){
    this.painter = painter;
    this.model = painter.layers;
    this.makeElements();
};
LayerUI.prototype = {
    'makeElements': function (){
        var layers = this.model.items,
            length = this.model.items.length,
            layerUI = this,
            i, layer, buttons;

        this.layers = [];
        this.container = $.element('div', {'class': "layerUI"});
        this.layersWrapper = $.element('ul', {'class': "layersWrapper"});

        for (i = 0; i < length; i++){
            layer = this.layers[i] = new LayerView(layers[i], this, this.painter);
            this.layersWrapper.appendChild(layer.element);
        }

        this.setCurrent(this.layers[0]);
        this.reorder();
       
        this.controls = $.element("div", {'class': "controls"}); 

        buttons = this.buttons = {
            newLayer: $.element('input', {
                'class': "newLayer",
                type: "button",
                value: "New Layer"
            }),

            moveUp: $.element('input', {
                'class': "moveUp",
                value: "\u2191", type: "button"
            }),

            moveDown: $.element('input', {
                'class': "moveDown", 
                value: "\u2193", type: "button"
            }),

            remove: $.element('input', {
                'class': "remove",
                value: "\u267b", type: "button"
            }),

            toggleVisible: $.element('input', {
                'class': "toggleVisible", 
                value: "hide", type: "button"
            })
        };
        
        buttons.newLayer.addEventListener('click', function (event){
            var name = window.prompt("new layer", "untitled");
            if (name.length) {
                layerUI.newLayer(name);
            }
        });

        layerUI.controls.appendChild(buttons.newLayer);

        ['remove', 'toggleVisible', 'moveUp', 'moveDown'].forEach(function (name){
            var button = layerUI.buttons[name];
            button.addEventListener('click', function (event){
                if (layerUI.current){
                    layerUI.current[name]();
                }
            });

            layerUI.controls.appendChild(button);
        });

        $.adopt(this.container, [this.controls, this.layersWrapper]);
    },
    
    newLayer: function (name){
        var model = this.model.createLayer(name),
            view = new LayerView(model, this, this.painter),
            wrapper = this.layersWrapper;

        wrapper.appendChild(view.element);
        this.layers.push(view);
        this.setCurrent(view);
        this.reorder();
    },

    reorder: function (){
        var layers = this.model.items,
            wrapper = this.layersWrapper,
            parent = this,
            layer, i;

        $.emptyElement(wrapper);
        
        this.layers = layers.map(function (model) {
            return new LayerView(model, parent, parent.painter);
        });

        this.layers.sort(function (a, b){
            return a.getIndex() - b.getIndex();
        });

        i = this.layers.length;

        while (i--) {
            layer = this.layers[i];
            if (this.painter.currentLayer === layer.model) {
                $.addClass(layer.element, 'current');
            }
            wrapper.appendChild(layer.element);
        }
    },

    setCurrent: function (item){
        var layer = item.model,
            element = item.element;

        this.painter.setCurrentLayer(layer);

        if (this.current){
            $.removeClass(this.current.element, 'current');
        }

        $.addClass(element, 'current');
        
        this.current = item;
    }
};

LayerView = function (model, parentUI, painter){
    // Performs the UI functions for a single layer
    this.model = model;       // Layer
    this.parentUI = parentUI; // LayerUI
    this.painter = painter;   // Painter

    this.createElements();
};
LayerView.prototype = {
    createElements: function (){
        var layer = this;
        this.element = $.element('li', {'class': "layer", html: this.model.name});
        this.element.addEventListener('click', function (){
            layer.setCurrent(); 
        });
    },

    getIndex: function (){
        return this.painter.layers.items.indexOf(this.model);
    },

    moveTo: function (where){
        this.painter.layers.moveLayer(this.model, where);
        this.parentUI.reorder();
    },

    moveUp: function (){
        var index = this.getIndex();

        if (index == -1){
            throw new Error("Couldn't find this layer in model");
        }

        if (index < this.painter.layers.items.length - 1) { 
            this.moveTo(this.getIndex() + 1);
        }
    },

    moveDown: function (){
        var index = this.getIndex();
        if (index == -1){
            throw new Error("Couldn't find this layer in model");
        }

        if (index > 0) { 
            this.moveTo(this.getIndex() - 1);
        }
    },

    toggleVisible: function (){
        this.model.toggleVisible();
        $.toggleClass(this.element, 'hidden');
    },

    remove: function (){
        this.painter.layers.removeLayer(this.model);
        if (this.painter.currentLayer === this.layer) {
            this.parent.setCurrent(this.parent.layers[0]);
        }

        this.parentUI.reorder();
    },

    setCurrent: function (){
        this.parentUI.setCurrent(this);
    }
};

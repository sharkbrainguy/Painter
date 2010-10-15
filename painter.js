// Painter - A Facade Class for painting on multiple layers {{{
function Painter(options){
    options = options || {};
    this.width = options.width   || 600;
    this.height = options.height || 400;
    this.layers = options.layers || new LayerCollection(this.width, this.height);
    this.brush = options.brush || new Brush();
    this.createElement();
    this.setCurrentLayer(0);
}

Painter.prototype = {
    'createElement': function (){
        if (this.element) return false;

        this.element = $element("div", {
            'class': "painterView",
            'style': "width: " + this.width + "px; " +
                     "height: " + this.height + "px;" 
        });

        this.element.appendChild(this.layers.element);
    },
    
    'beginPath': function (){
        this.currentLayer.context.beginPath();
    },

    'moveTo': function (x, y){
        this.currentLayer.context.moveTo(x, y);
    },

    'lineTo': function (x, y){
        var context = this.currentLayer.context;
        context.lineTo(x, y);
        context.stroke();
    },

    'setCurrentLayer': function (index){
        this.currentIndex = index;
        this.currentLayer = this.layers.get(index);
        this.currentLayer.loadBrush(this.brush);
    },

    'getCurrentLayer': function (){
        return this.currentLayer;
    },

    'setBrush': function (brush){
        this.brush = brush;
        this.currentLayer.loadBrush(this.brush);
    },

    'getBrush': function (){
        return this.brush; 
    },

    'updateBrush': function (data){
        this.brush.load(data);
        this.currentLayer.loadBrush(this.brush);
    }
};

Painter.fromJSON = function (json){
    var data = JSON.parse(json);
    return new Painter({
        'width': data.width,
        'height': data.height, 
        'layers': LayerCollection.from(json)
    });
};
// }}}
// LayerCollection {{{
function LayerCollection(width, height){
    this.width = width;
    this.height = height;
    this.items = [];
    this.createElement();
    this.createLayer('Background');
}

LayerCollection.prototype = {
    'createElement': function (){
        if (!this.element){
            this.element = $element('div', {
                'class': "layerContainer",
                'style': "width: " + this.width + "px; " +
                         "height: " + this.height + "px;"
            });
        }
    },

    'createLayer': function (name, where){
        var layer = new Layer(name, this.width, this.height);
        this.insertLayer(layer, where);

        return layer;
    },

    'insertLayer': function (layer, where){
        var index = this.index(where || "top");
        this.element.insertBefore(layer.canvas, this.element.children[index]);
        this.items.splice(index, 0, layer);
    },

    'removeLayer': function (layer){
        var layer = this.get(layer);
            
        if (layer){
            var index = this.items.indexOf(layer);
            this.items.splice(index, 1);
            this.element.removeChild(layer.canvas);
        }

        return layer;
    },

    'moveLayer': function (layer, where){
        this.removeLayer(this.removeLayer(layer), where);
    },

    'index': function (where){
        return typeof(where) === "number" ? where
            :  where === "above"  ? this.currentIndex + 1
            :  where === "below"  ? this.currentIndex
            :  where === "bottom" ? 0
            :  this.items.length; // assume top
    },

    'get': function (layer){
        var items = this.items;
        return items.indexOf(layer) > -1 ? (layer instanceof Layer && layer) 
            :  layer === 'top' ? items[items.length - 1]
            :  items[layer] || null;
    },

    'getMergedData': function (){
        var canvas = $element("canvas", {'width': this.width, 'height': this.height});
        var ctx = canvas.getContext("2d");

        this.items.forEach(function (layer){
            var image = new Image();
            image.onload = function (){
                ctx.drawImage(image, 0, 0);
            }

            image.src = layer.canvas.toDataURL();
        });  

        return canvas.toDataURL();
    },

    'toJSON': function (){
        return JSON.stringify({
            'width': this.width, 
            'height': this.height,
            'layers': this.items.map(function (layer){
                return layer.toJSON();
            })
        });
    } 
};

LayerCollection.fromJSON = function (str){
    var layers = new LayerCollection(data.width, data.height),
        data = JSON.parse(str), layer;

    for (var name in data) if (data.hasOwnProperty(name)){
        layers.createLayer(name).loadImage(data[name]);
    }

    return layers;
}
// }}}
// Layer {{{
function Layer(name, width, height){
    this.name = name;
    this.canvas = $element("canvas", {
        'width': width,
        'height': height,
        'data-name': name
    });

    this.context = this.canvas.getContext('2d');
}

Layer.prototype = {
    'loadImage': function (uri, preserve){
        var layer = this, image = new Image();
        
        image.onload = function (){
            if (!preserve) layer.clear();
            layer.context.save();
            layer.context.globalCompositeOperation = "source-over";
            layer.context.drawImage(image, 0, 0);
            layer.context.restore();
        };

        image.src = uri;
    },

    'clear': function (){
        var width = this.canvas.getAttribute('width'),
            height = this.canvas.getAttribute('height');

        this.context.clearRect(0, 0, width, height);
    },

    'loadBrush': function (brush){
        var ctx = this.context;
        ctx.lineWidth = brush.size;
        ctx.lineCap = ctx.lineJoin = brush.style;
        ctx.strokeStyle = brush.color;
        ctx.globalAlpha = brush.opacity
        ctx.globalCompositeOperation = brush.getCompositeOperation();
    },

    'toJSON': function (){
        return JSON.stringify({
            name: this.name,
            data: this.context.getDataURI()
        });
    }
};
// }}}
// Brush {{{
function Brush(data){
    if (data) this.load(data);
}

Brush.prototype = {
    'color': "#000000",
    'opacity': 1,
    'style': "round",
    'size': 10,

    'setSize': function (size){
        this.size = Math.max(parseInt(size, 10), 1); 
    },

    'setOpacity': function (opacity){
        opacity = parseFloat(opacity, 10);
        opacity = Math.min(opacity, 1);
        this.opacity = Math.max(opacity, 0);
    },

    'setColor': function(color){
        this.color = color;
    },

    'setMode': function (mode){
        this.mode = (Brush.modes[mode] ? mode : "paint");
    },

    'getCompositeOperation': function (){
        return Brush.modes[this.mode];
    },

    'load': function (data){
        if (data.color)   this.setColor(data.color);
        if (data.opacity) this.setOpacity(data.opacity);
        if (data.size)    this.setSize(data.size);
        if (data.style)   this.setStyle(data.style);
        if (data.mode)    this.setMode(data.mode);
    }
};

Brush.modes = {
    // friendly names for the composite operations
    'paint': "source-over",
    'erase': "destination-out",
    'behind': "destination-over",
    'inside': "source-atop",
    'lighten': "lighter",
    'darken': "darker"
};

Brush.fromJSON = function (json){
    var brush = new Brush();
    brush.load(JSON.parse(json));
    return brush;
};
// }}}

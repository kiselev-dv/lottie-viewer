const LOOP_VIDEO = true;
const AUTOPLAY_VIDEO = true;

const animationTree = new Vue({
    el: '#animation-tree',
    data: {
        animation: null,
    },
});

const lottiePlayer = new Vue({
    el: '#animation-player',
    data: {
        animation: null,
        player: null,
        layer: null,
        api: null,
        scaleX: null,
        scaleY: null,
        scaleZ: null,
        positionX: null,
        positionY: null,
        positionZ: null,
        layerScale: [],
        layerScaleOverride: false,
        layerPositionOverride: false,
        layerPosition: []
    },
    watch: {
        animation: function (animation) {
            const canvas = document.getElementById('canvas');
            canvas.innerHTML = '';

            this.player = lottie.loadAnimation({
                container: canvas,
                renderer: 'svg',
                loop: LOOP_VIDEO,
                autoplay: AUTOPLAY_VIDEO,
                animationData: animation
            });

            this.api = lottie_api.createAnimationApi(this.player);
        },
        layer: function(layer) {
            const self = this;

            const scale = this.api.getKeyPath(layer.nm + ',Transform,Scale');
            this.api.addValueCallback(scale, function(currentValue) {
                self.layerScale = currentValue;
                if (self.layerScaleOverride) {
                    return [Number(self.scaleX), Number(self.scaleY), Number(self.scaleZ)];
                }
                else if (self.scaleX === null) {
                    self.scaleX = currentValue[0];
                    self.scaleY = currentValue[1];
                    self.scaleZ = currentValue[2];
                }
                return currentValue;
            });
            const pos = this.api.getKeyPath(layer.nm + ',Transform,Position');
            this.api.addValueCallback(pos, function(currentValue) {
                self.layerPosition = currentValue;
                if (self.layerPositionOverride) {
                    return [Number(self.positionX), Number(self.positionY), Number(self.positionZ)];
                }
                else if (self.positionX === null) {
                    self.positionX = currentValue[0];
                    self.positionY = currentValue[1];
                    self.positionZ = currentValue[2];
                }
                return currentValue;
            });
        }
    },
    methods: {
        play: function() {
            this.player.play();
        }
    }
});

Vue.component('lottie-layer', {
    template:`
    <div class="lottie-layer">
        <div><a @click="onClick">{{ layer.nm }}</a></div>
        <div v-if="layer.parent" class="layer-parent">Parent: {{ getNameForIndex(layer.parent) }}</div>
        <div v-if="layer.hasMask" class="layer-masks">
            <div>Layer masks</div>
            <layer-mask v-for="mask in layer.masksProperties" v-bind:mask="mask" v-bind:key="mask.nm"></layer-mask>
        </div>
    </div>
    `,
    props: {
        layer: Object
    },
    methods: {
        onClick: function () {
            lottiePlayer.layer = this.layer;
        },
        getNameForIndex: function(index) {
            return this.$parent.animation.layers.find(l => { return l.ind == index }).nm;
        }
    }
});

Vue.component('layer-mask', {
    template:`
        <div>
            <span class="mask-name"><a>{{ mask.nm }}</a></span> (
                Mode: {{mask.mode}}
                <span class="mask-inverse" v-if="mask.inv">, Inverse</span>)
        </div>
    `,
    props: {
        mask: Object
    }
});


(() => {
    const nullEventHandler = e => {
        e.stopPropagation();
        e.preventDefault();
    };

    const dropbox = document.getElementById("dropbox");
    dropbox.addEventListener("dragenter", nullEventHandler, false);
    dropbox.addEventListener("dragover", nullEventHandler, false);
    dropbox.addEventListener("drop", e => {
        nullEventHandler(e);
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }, false);

    document.getElementById('input').onchange = e => {
        handleFiles(e.target.files);
    };

    function handleFiles(files) {
        const file = files[0];
        document.getElementById('dropbox').innerText = file.name;
        readJSONfromFile(file).then(loadAnimationJSON);
    }

})();

function loadAnimationJSON(animation) {
    console.log(JSON.parse(JSON.stringify(animation)));

    animationTree.animation = animation;
    lottiePlayer.animation = animation;
}

function readJSONfromFile(file) {
    return new Promise(function(resolve) {
        const reader = new FileReader();
        reader.onload = (function(theFile) {
            return function(e) {
                resolve(JSON.parse(e.target.result));
            };
        })(file);

        reader.readAsText(file);
    });
}
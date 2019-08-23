const LOOP_VIDEO = true;
const AUTOPLAY_VIDEO = true;

const animationTree = new Vue({
    el: '#animation-tree',
    data: {
        animation: null,
    },
});

let player = null;

const lottiePlayer = function() {
    let apiPromiseResolve = null;
    return new Vue({
        el: '#animation-player',
        data: {
            animation: null,
            apiPromise: new Promise(function(resolve) {
                apiPromiseResolve = resolve;
            }),
            frames: 0,
            paused: false,
            currentFrame: 0
        },
        watch: {
            animation: function (animation) {
                const canvas = document.getElementById('canvas');
                canvas.innerHTML = '';

                player = lottie.loadAnimation({
                    container: canvas,
                    renderer: 'svg',
                    loop: LOOP_VIDEO,
                    autoplay: AUTOPLAY_VIDEO,
                    animationData: animation
                });

                this.frames = player.totalFrames;
                player.addEventListener('enterFrame', () => {
                    lottiePlayer.currentFrame = player.currentFrame;
                });

                this.api = lottie_api.createAnimationApi(player);

                apiPromiseResolve(this.api);
            }
        },
        methods: {
            play: function() {
                player.play();
            },
            pause: function() {
                player.isPaused ? player.play() : player.pause();
                this.paused = player.isPaused;
            },
            onRangeInput: function(e) {
                const targetFrame = parseFloat(e.target.value);
                if (!Number.isNaN(targetFrame) && targetFrame >= 0 && targetFrame <= player.totalFrames) {
                    player.isPaused ?
                        player.goToAndStop(targetFrame, true) :
                        player.goToAndPlay(targetFrame, true);
                }
            }
        }
    });
}();

(function() {
    const callbacks = {};

    Vue.component('lottie-layer', {
        template:`
        <div class="lottie-layer">
            <div>
                <span class="layer-title">{{ layer.nm }}</span>
                <button calls="value-callback" v-if="callbacks" @click="attachValueCallback">Value Callback</button>
            </div>
            <div class="layer-properties">
                <span class="value-name">Position: </span>
                <span class="value-view">
                    <span v-bind:class="{ overridden: layerPositionOverride }" class="val">{{position.x}}</span>
                    <span v-bind:class="{ overridden: layerPositionOverride }" class="val">{{position.y}}</span>
                    <span v-bind:class="{ overridden: layerPositionOverride }" class="val">{{position.z}}</span>
                </span>
                <span v-if="attached">
                    <span>Override</span>
                    <input type="checkbox" id="checkbox" v-model="layerPositionOverride">
                    <input class="value-override" v-model="positionX"/>
                    <input class="value-override" v-model="positionY"/>
                    <input class="value-override" v-model="positionZ"/>
                </span>
            </div>
            <div class="layer-properties">
                <span class="value-name">Scale: </span>
                <span class="value-view">
                    <span v-bind:class="{ overridden: layerScaleOverride }" class="val">{{scale.x}}</span>
                    <span v-bind:class="{ overridden: layerScaleOverride }" class="val">{{scale.y}}</span>
                    <span v-bind:class="{ overridden: layerScaleOverride }" class="val">{{scale.z}}</span>
                </span>
                <span v-if="attached">
                    <span>Override</span>
                    <input type="checkbox" id="checkbox" v-model="layerScaleOverride">
                    <input class="value-override" v-model="scaleX"/>
                    <input class="value-override" v-model="scaleY"/>
                    <input class="value-override" v-model="scaleZ"/>
                </span>
            </div>
            <div v-if="layer.parent" class="layer-parent">Parent: {{ getNameForIndex(layer.parent) }}</div>
            <div v-if="layer.hasMask" class="layer-masks">
                <div>Layer masks</div>
                <layer-mask v-for="mask in layer.masksProperties" v-bind:mask="mask" v-bind:key="mask.nm"></layer-mask>
            </div>
            <div v-if="layer.shapes" class="layer-shapes">
                <div>Shapes</div>
                <shape v-for="shape in layer.shapes" v-bind:shape="shape" v-bind:key="shape.ix"></shape>
            </div>
        </div>
        `,
        props: {
            layer: Object,
            callbacks: Boolean
        },
        data: function() {
            return {
                position: {x: null, y: null, z: null},
                scale: {x: null, y: null, z: null},
                attached: false,
                layerPositionOverride: false,
                positionX: null,
                positionY: null,
                positionZ: null,
                layerScaleOverride: false,
                scaleX: null,
                scaleY: null,
                scaleZ: null
            }
        },
        created: function() {
            const self = this;
            lottiePlayer.apiPromise.then(api => {
                const pos = api.getKeyPath(this.layer.nm + ',Transform,Position');
                setInterval(() => {
                    self.position.x = pos.getElements()[0].getValue()[0];
                    self.position.y = pos.getElements()[0].getValue()[1];
                    self.position.z = pos.getElements()[0].getValue()[2];
                }, 100);

                const scale = api.getKeyPath(this.layer.nm + ',Transform,Scale');
                setInterval(() => {
                    self.scale.x = scale.getElements()[0].getValue()[0];
                    self.scale.y = scale.getElements()[0].getValue()[1];
                    self.scale.z = scale.getElements()[0].getValue()[2];
                }, 100);
            });
        },
        methods: {
            getNameForIndex: function(index) {
                return this.$parent.animation.layers.find(l => { return l.ind == index }).nm;
            },
            attachValueCallback: function() {
                const self = this;
                lottiePlayer.apiPromise.then(api => {
                    if (!this.callbacks || callbacks[this.layer.nm]) {
                        return;
                    }
                    callbacks[this.layer.nm] = this.layer.nm;

                    console.log(`Add value callback for ${this.layer.nm}`);

                    const pos = api.getKeyPath(this.layer.nm + ',Transform,Position');
                    api.addValueCallback(pos, function(currentValue) {
                        self.position.x = currentValue[0];
                        self.position.y = currentValue[1];
                        self.position.z = currentValue[2];
                        if (self.layerPositionOverride) {
                            return Float32Array.from([
                                parseFloat(self.positionX),
                                parseFloat(self.positionY),
                                parseFloat(self.positionZ)
                            ]);
                        }
                        else if (self.positionX === null) {
                            self.positionX = currentValue[0];
                            self.positionY = currentValue[1];
                            self.positionZ = currentValue[2];
                        }
                        return currentValue;
                    });

                    const scale = api.getKeyPath(this.layer.nm + ',Transform,Scale');
                    api.addValueCallback(scale, function(currentValue) {
                        self.scale.x = currentValue[0];
                        self.scale.y = currentValue[1];
                        self.scale.z = currentValue[2];
                        if (self.layerScaleOverride) {
                            return Float32Array.from([
                                parseFloat(self.scaleX),
                                parseFloat(self.scaleY),
                                parseFloat(self.scaleZ)
                            ]);
                        }
                        else if (self.scaleX === null) {
                            self.scaleX = currentValue[0];
                            self.scaleY = currentValue[1];
                            self.scaleZ = currentValue[2];
                        }
                        return currentValue;
                    });

                    self.attached = true;
                });
            }
        }
    });
})();

Vue.component('shape', {
    template:`
    <div class="shape">
        <div><a @click="onClick">{{ shape.nm }}</a> <span>({{shape.ty}})</span></div>
    </div>
    `,
    props: {
        shape: Object
    },
    methods: {
        onClick: function () {
            // Do nothing
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
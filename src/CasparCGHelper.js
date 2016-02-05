import { EventEmitter } from 'events';

class CasparCGHelper extends EventEmitter {

    constructor() {
        super();

        /**
         * Set up our global methods called by CasparCG in a way that other modules can be triggered.
         */
        let methods = ['play', 'update', 'stop', 'next'];
        for (let i = 0; i < methods.length; i++) {
            let method = methods[i];
            if (typeof window[method] === 'function' && !(/\{\s*\[native code\]\s*\}/).test('' + window[method])) {
                let existingMethod = window[method];
                this.on(method, existingMethod);
            }
            window[method] = this[method].bind(this);
        }
    }

    /**
     * Determines whether we are running inside CasparCG or a web browser by looking for the injected function via the CasparCG server
     *   modules/html/html.cpp:OnContextCreated()
     * @param {boolean} populateWindowProperties Whether to populate `window.isCasparCG` and BODY class
     * @returns {boolean} Whether we are running inside CasparCG or not
     */
    static isCasgparCG(populateWindowProperties) {
        let isCasparCG = typeof window !== 'undefined' && typeof window.tickAnimations !== 'undefined';
        if (populateWindowProperties) {
            window.isCasparCG = isCasparCG;
            if (typeof document !== 'undefined') {
                document.getElementsByTagName('body')[0].classList.toggle('not-casparcg', !isCasparCG);
            }
        }
        return isCasparCG;
    };

    /**
     * Called by CasparCG
     */
    play() {
        this.emit('play');
    };

    /**
     * Called by CasparCG
     */
    stop() {
        this.emit('stop');
    };

    /**
     * Called by CasparCG
     * @param {string} data
     */
    update(data) {
        this.emit('update', CasparCGHelper.parseData(data));
    };

    /**
     * Called by CasparCG
     */
    next() {
        this.emit('next');
    };

    /**
     * Attempts to parse template data passed in by CasparCG
     * @param data
     * @returns {Object} Template data in "key": "value" pairs or an empty object {}
     */
    static parseData(data) {
        let values = {};
        if (typeof data === 'object') {
            values = data;
        } else if (typeof data === 'string') {
            try {
                // Hopefully we were sent the data in JSON format
                values = JSON.parse(data);
            } catch (error) {
                // Maybe we were passed XML
                if (data && data.substr(0, 14) == '<templateData>') {
                    let parser = new DOMParser();
                    try {
                        let xmlDoc = parser.parseFromString(data, "text/xml");
                        // We expect CasparCG to send us XML with "componentData" nodes
                        let dataNodes = xmlDoc.getElementsByTagName('componentData');
                        for (let i = 0; i < dataNodes.length; i++) {
                            let node = dataNodes[i];
                            let key = node.getAttribute('id');
                            let value = node.getElementsByTagName('data');
                            if (value.length) {
                                value = value[0];
                                if (value) {
                                    value = value.getAttribute('value');
                                    if (key && value) {
                                        // We are good, put the "key": "value" pair together
                                        values[key.trim()] = value.trim();
                                    }
                                }
                            }
                        }
                    } catch (xmlError) {
                        // Couldn't parse the data :(
                    }
                }
            }
        }
        return values;
    };
}

module.exports = CasparCGHelper;
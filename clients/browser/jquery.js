(function( $ ) {
     $.fn.eventHub = function(io, url) {
        var $this = $(this)
            , _this = $this
            ;

        if ($.fn.eventHub.EH) {
            return $.fn.eventHub.EH;
        }

        // Stash it
        $.fn.eventHub.EH = $this;

        $this.socket   = io.connect(url);
        $this._trigger = $this.trigger;
        $this._bind    = $this.bind;
        $this.events   = {};
        $this.session = document.cookie;
        if ($this.session) {
            var matches = $this.session.match(/eventHub=([^;]+)/);
            if (matches) {
                $this.session = matches[1];
            } else {
                $this.session = null;
            }
        }

	    $this.socket.on('ready', function(session) {
            document.cookie = 'eventHub=' + session + '; expires=Thu, 11 Aug 2069 20:47:11 UTC; path=/`
            _this.session = session;
            _this.socket.$emit = function() { 
                _this.triggerHandler.call(_this, arguments[0], Array.prototype.splice.call(arguments, 1)); 
            };
            _this._trigger('eventHubReady');
        });

        $this.socket.on('connect', function() {
            if (!$this.session) {
                $this.socket.emit('eventHub:session');
            } else {
                _this.socket.$emit = function() { 
                    _this.triggerHandler.call(_this, arguments[0], Array.prototype.splice.call(arguments, 1)); 
                };
                _this._trigger('eventHubReady');
            }
        });

        $this.trigger = $this.fire = function() {
            _this.socket.emit.apply(_this.socket, arguments);
        };

        /* Tell event switch we're listening for a unicast event... */
        $this.bind = function(eventName, func, args) {
            this._bind.call(this, eventName, func);
            if (typeof(args) !== 'undefined') {
                this.trigger('eventHub:on', eventName, args);
            }
        };

        /*
         * An optional helper function to set up compiler-checkable event names
         *  var clickEvent = hub.addEvent('click');
         *  clickEvent.bind(function(...) { ... } );
         *  clickEvent.trigger({ foo: 'goo' }, ... );
         */
        $this.addEvent = function(eventName) {
            var _this = this;
            this.events[eventName] = {
                bind: function(callback, args) { _this.bind.call(_this, eventName, callback, args); }
                , trigger: function() {
                    Array.prototype.unshift.call(arguments, eventName);
                    _this.trigger.apply(_this, arguments);
                }
            };
            return this.events[eventName];
        };

        return $this;
    };
})(jQuery);

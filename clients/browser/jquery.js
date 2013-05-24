// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
(function( $ ) {
     $.fn.eventHub = function(io, url) {
        var $this = $(this)
            , _this = $this
            , eid = 0
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
            document.cookie = 'eventHub=' + session + '; expires=Thu, 11 Aug 2069 20:47:11 UTC; path=/';
            _this.session = session;
            _this.socket.$emit = function() { 
                // skip over jquery event object
                var trig = arguments[1] || {};
                if (trig.type) {
                    if (console && console.error) {
                        console.error("Your response should not use the key 'type' thanks jQuery!");
                        console.error("it will be clobbered - you can find it in obj._type now");
                    }
                    trig._type = trig.type;
                }
                trig.type = arguments[0];
                _this._trigger(trig, Array.prototype.splice.call(arguments, 2)); 
            };
            _this._trigger('eventHubReady');
        });

        $this.socket.on('connect', function() {
            $this.socket.emit('eventHub:session', $this.session);
        });

        $this.trigger = $this.fire = function() {
            _this.socket.emit.apply(_this.socket, arguments);
        };

        /* Tell event switch we're listening for a unicast/multicast event... */
        $this.bind = function(eventName, func, args) {
            this._bind.call(this, eventName, func);
            if (typeof(args) !== 'undefined') {
                args.ts = eid++;
                this.one('eventClient:' + args.type + ':' + args.ts, function(eventObj, err) {
                    if (err) {
                        $this.off(eventName, func);
                    }
                    if (args.cb) {
                        args.cb(err);
                    }
                });
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

        $this.makeListener = function(func, thisp) {
            // if no callback assume a local call
            return function(data, callback) {
                try {
                    var ret = func.call(thisp, data);
                    return callback ? callback(null, ret) : ret;
                } catch(e) {
                    if (callback) {
                        callback(e)
                    } else {
                        throw e;
                    }
                }
            }
        };

        return $this;
    };
})(jQuery);

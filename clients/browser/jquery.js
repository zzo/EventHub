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

        $this.socket   = io.connect(url, {secure: true});
        $this._trigger = $this.trigger;
        $this.events   = {};

        $this.socket.on('connect', function() {
            _this.socket.$emit = function() { 
                $this.triggerHandler.call($this, arguments[0], Array.prototype.splice.call(arguments, 1)); 
            };
            $this._trigger('eventHubReady');
        });

        $this.trigger = $this.fire = function() {
            _this.socket.emit.apply(_this.socket, arguments);
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
                bind: function(callback) { _this.bind.call(_this, eventName, callback); }
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

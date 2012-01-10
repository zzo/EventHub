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

        $this.socket.on('connect', function() {
            _this.socket.$emit = function() { 
                $this.triggerHandler.call($this, arguments[0], Array.prototype.splice.call(arguments, 1)); 
            };
            $this._trigger('eventHubReady');
        });

        $this.trigger = $this.fire = function() {
            _this.socket.emit.apply(_this.socket, arguments);
        };

        return $this;
    };
})(jQuery);

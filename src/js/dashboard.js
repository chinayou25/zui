/* Dashboard */
+function($, window, document, Math)
{
    "use strict";

    var Dashboard = function(element, options)
    {
        this.$         = $(element);
        this.options   = this.getOptions(options);
        this.draggable = this.$.hasClass('dashboard-draggable') || this.options.draggable;

        this.init();
    };

    Dashboard.DEFAULTS = {height: 360};

    Dashboard.prototype.getOptions = function (options)
    {
        options = $.extend({}, Dashboard.DEFAULTS, this.$.data(), options);
        return options;
    };

    Dashboard.prototype.handleRemoveEvent = function()
    {
        var afterPanelRemoved = this.options.afterPanelRemoved;
        var tip = this.options.panelRemovingTip;
        this.$.find('.remove-panel').click(function()
        {
            var panel = $(this).closest('.panel');
            var name  = panel.data('name') || panel.find('.panel-heading').text().replace('\n', '').replace(/(^\s*)|(\s*$)/g, "");
            var index = panel.attr('data-id');

            if(tip == undefined || confirm(tip.format(name)))
            {
                panel.parent().remove();
                if(afterPanelRemoved && $.isFunction(afterPanelRemoved))
                {
                    afterPanelRemoved(index);
                }
            }
        });
    };

    Dashboard.prototype.handleRefreshEvent = function()
    {
        this.$.find('.refresh-panel').click(function()
        {
            var panel = $(this).closest('.panel');
            refreshPanel(panel);
        });
    }

    Dashboard.prototype.handleDraggable = function()
    {
        var dashboard    = this.$;
        var afterOrdered = this.options.afterOrdered;

        this.$.addClass('dashboard-draggable');

        this.$.find('.panel-actions').mousedown(function(event)
        {
            event.preventDefault();
            event.stopPropagation();
        });

        this.$.find('.panel-heading').mousedown(function(event)
        {
            var panel     = $(this).closest('.panel');
            var row       = panel.closest('.row');
            var dPanel    = panel.clone().addClass('panel-dragging-shadow');
            var pos       = panel.offset();
            var dPos      = dashboard.offset();

            dashboard.addClass('dashboard-dragging');
            panel.addClass('panel-dragging').parent().addClass('dragging-col');

            dPanel.css(
            {
                left    : pos.left - dPos.left,
                top     : pos.top - dPos.top,
                width   : panel.width(),
                height  : panel.height()
            }).appendTo(dashboard).data('mouseOffset', {x: event.pageX - pos.left + dPos.left, y: event.pageY - pos.top + dPos.top});

            $(document).bind('mousemove',mouseMove).bind('mouseup',mouseUp);
            event.preventDefault();

            function mouseMove(event)
            {
                var offset = dPanel.data('mouseOffset');
                dPanel.css(
                {
                    left : event.pageX-offset.x,
                    top  : event.pageY-offset.y
                });

                row.find('.dragging-in').removeClass('dragging-in');
                row.children().each(function()
                {
                    var p = $(this).children('.panel');
                    if(!p.length) return true;
                    var pP = p.offset(), pW = p.width(), pH = p.height();
                    var pX = pP.left - pW * 2 / 2, pY = pP.top;
                    var mX = event.pageX, mY = event.pageY;

                    if(mX > pX && mY > pY && mX < (pX + pW*2) && mY < (pY + pH))
                    {
                        var dCol = row.find('.dragging-col');
                        var dColShadow = row.find('.dragging-col-holder');
                        if(!dColShadow.length)
                        {
                            dColShadow = $("<div class='dragging-col-holder'><div class='panel'></div></div>").addClass(dCol.attr('class')).removeClass('dragging-col').appendTo(row);
                        }
                        dColShadow.find('.panel').replaceWith(panel.clone());
                        dColShadow.insertBefore(p.parent().addClass('dragging-in'));
                        dashboard.addClass('dashboard-holding');
                        return false;
                    }
                    else
                    {
                        dashboard.removeClass('dashboard-holding');
                    }
                });
                event.preventDefault();
            }

            function mouseUp(event)
            {
                var draggingIn = row.find('.dragging-in');
                var pOrder = panel.data('order');
                var dOrder = draggingIn.find('.panel').data('order');

                if(dOrder && pOrder != dOrder && pOrder != (dOrder - 1))
                {
                    panel.parent().insertBefore(draggingIn);
                    var newOrder = 0;
                    var newOrders = {};
                    var oldOrders = row.data('orders');


                    row.children(':not(.panel-dragging)').each(function(index)
                    {
                        var p = $(this).children('.panel');
                        p.data('order', ++newOrder);
                        newOrders[p.attr('id')] = newOrder;
                    });

                    row.data('orders', newOrders);

                    if(afterOrdered && $.isFunction(afterOrdered))
                    {
                        afterOrdered(newOrders);
                    }
                }

                dPanel.remove();

                dashboard.removeClass('dashboard-holding');
                dashboard.find('.dragging-col').removeClass('dragging-col');
                dashboard.find('.panel-dragging').removeClass('panel-dragging');
                draggingIn.removeClass('dragging-in');
                dashboard.removeClass('dashboard-dragging');
                $(document).unbind('mousemove', mouseMove).unbind('mouseup', mouseUp);
                event.preventDefault();
            }
        });
    };

    Dashboard.prototype.handlePanelPadding = function()
    {
        this.$.find('.panel-body > table, .panel-body > .list-group').closest('.panel-body').addClass('no-padding');
    };

    Dashboard.prototype.handlePanelHeight = function()
    {
        var dHeight = this.options.height;

        this.$.find('.row').each(function()
        {
            var row = $(this);
            var panels = row.find('.panel');
            var height = row.data('height') || dHeight;

            if(typeof height != 'number')
            {
                height = 0;
                panels.each(function()
                {
                    height = Math.max(height, $(this).innerHeight());
                });
            }

            panels.each(function()
            {
                var $this = $(this);
                $this.find('.panel-body').css('height', height - $this.find('.panel-heading').outerHeight() - 2);
            });
        });
    };

    function refreshPanel(panel)
    {
        var url = panel.data('url');
        if(!url) return;
        panel.addClass('panel-loading').find('.panel-heading .icon-refresh,.panel-heading .icon-repeat').addClass('icon-spin');
        $.ajax(
        {
            url: url,
            dataType: 'html',
        })
        .done(function(data)
        {
            panel.find('.panel-body').html(data);
        })
        .fail(function()
        {
            panel.addClass('panel-error');
        })
        .always(function()
        {
            panel.removeClass('panel-loading');
            panel.find('.panel-heading .icon-refresh,.panel-heading .icon-repeat').removeClass('icon-spin');
        });
    }

    Dashboard.prototype.init = function()
    {
        this.handlePanelHeight();
        this.handlePanelPadding();
        this.handleRemoveEvent();
        this.handleRefreshEvent();

        if(this.draggable) this.handleDraggable();

        var orderSeed = 0;
        this.$.find('.panel').each(function()
        {
            var $this = $(this);
            $this.data('order', ++orderSeed);
            if(!$this.attr('id'))
            {
                $this.attr('id', 'panel' + orderSeed);
            }
            if(!$this.attr('data-id'))
            {
                $this.attr('data-id', orderSeed);
            }

            refreshPanel($this);
        });
    }

    $.fn.dashboard = function(option)
    {
        return this.each(function()
        {
            var $this   = $(this);
            var data    = $this.data('zui.dashboard');
            var options = typeof option == 'object' && option;

            if (!data) $this.data('zui.dashboard', (data = new Dashboard(this, options)));

            if (typeof option == 'string') data[option]();
        })
    };

    $.fn.dashboard.Constructor = Dashboard;
}(jQuery,window,document,Math);

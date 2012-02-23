/*!
 * tinyLightbox - Lightbox clone for jQuery
 *
 * http://kof.github.com/jquery-tinyLightbox/demo/
 *
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Depends:
 *   - jquery.js
 *   - optional jquery.bgiframe.js
 *
 *  Copyright (c) 2008 Oleg Slobodskoi
 */
(function($, window, document, undefined) {

$.fn.tinyLightbox = function(options) {
    return this.each(function() {
        var inst = $.data(this, 'tinyLightbox');

        if (!inst) {
            inst = new TinyLightbox(this, options);
            inst.init();
            $.data(this, 'tinyLightbox', inst);
        }
    });
};

/* defaults */
$.fn.tinyLightbox.options = {
    // selector inside of container
    item: 'a',
    slideshowSpeed: 5000,
    slideshowAutostart: false,
    // zoom image path
    pathAttr: 'href',
    // description attribute
    descrAttr: 'title',
    // animations speed
    speed: 300,
    labelImage: 'Image',
    labelOf: 'of',
    //animation extension name
    animation: 'original',
    // keyboard navigation enabled/disabled
    keyNavigation: true,
    // go to the first item after the last one
    cycle: false,
    // if the image is smaller than minWidth,
    // minWidth will be used for the frame width instead
    minWidth: 250,
    minHeight: 190,
    overlayOpacity: 0.7,
    // fix selectboxes for ie6, using bgiframe plugin
    bgiframe: true,
    easing: 'swing'
};


function TinyLightbox(container, options) {
    var template = '\
        <div id="tiny-lightbox" class="tiny-lightbox-animating tiny-lightbox-loading">\
            <div id="tiny-lightbox-overlay" data-action="close"></div>\
            <div id="tiny-lightbox-box" >\
                <div id="tiny-lightbox-image"></div>\
                <a id="tiny-lightbox-prev" data-action="showPrev" hidefocus="hidefocus" href="#">\
                    <span data-action="showPrev"></span>\
                </a>\
                <a id="tiny-lightbox-next" data-action="showNext" hidefocus="hidefocus" href="#">\
                    <span data-action="showNext"></span>\
                </a>\
            </div>\
            <div id="tiny-lightbox-bar">\
                <div id="tiny-lightbox-description"></div>\
                <span id="tiny-lightbox-stats"></span>\
                <a id="tiny-lightbox-close" title="Close" alt="Close" data-action="close" href="#"></a>\
                <a id="tiny-lightbox-slideshow" title="Slideshow" alt="Slideshow" data-action="slideshow" href="#"/>\
            </div>\
        </div>\
    ';

    var self = this,
        $container = $(container),
        $tl,
        $elems,
        $stats,
        $descr,
        $prevNext,
        animations,
        activeIndex,
        running,
        cycle;

    var o = this.options = $.extend({}, $.fn.tinyLightbox.options, options);


    this.init  = function() {
        cycle = o.cycle;
        animations = new $.fn.tinyLightbox[o.animation](self);
        $elems = $(o.item + '[' + o.pathAttr + ']', $container);

        $container.bind('click', function(e) {
            var $elem = $(e.target).closest(o.item);

            activeIndex = $elems.index($elem[0]);

            // it is not a preview
            if (activeIndex == -1) return;

            // prevent double lightbox if user clicks via keyboard
            if (self.$tl) return false;

            self.$tl = $(template).appendTo('body');

            // overlay
            self.$overlay = $('#tiny-lightbox-overlay').css('opacity', o.overlayOpacity);
            resizeOverlay();

            // image container
            self.$box = $('#tiny-lightbox-box');
            self.$image = $('#tiny-lightbox-image');
            self.path = $elem.attr(o.pathAttr);

            self.boxData = {
                width: self.$box.width(),
                height: self.$box.height(),
                top: parseInt(self.$box.css('top'))  +  self.docData.scrollTop,
                borderWidth: (self.$box.outerWidth()-self.$box.innerWidth())/2 || 0
            };
            setLeft();



            // toolbar
            self.$bar = $('#tiny-lightbox-bar');
            $descr = $('#tiny-lightbox-description');
            $stats = $('#tiny-lightbox-stats');
            updateBar();

            // bind click handler
            self.$tl.bind('click',function(e) {
                var act = $(e.target).attr('data-action');
                if (!act) return;
                self[ act ]();
                return false;
            });

            // bind hover event
            $prevNext = $('#tiny-lightbox-next, #tiny-lightbox-prev').bind('mouseout mouseover',function(){
                $('span', this).toggleClass('tiny-lightbox-hover');
            });

            // bind window resize event for overlay
            $(window).bind('resize scroll',resizeOverlay);

            o.keyNavigation && $(document).bind('keydown',keyNavigation);
            o.bgiframe && $.fn.bgiframe && self.$tl.bgiframe();

            // start animations
            animations.start(function(){
                preload(self.path, function(){
                    animations.animate(function(){
                        resizeOverlay();
                        self.$tl.removeClass('tiny-lightbox-animating');
                        if (o.slideshowAutostart) {
                            running = setTimeout(slideshow, o.slideshowSpeed);
                            self.$bar.addClass('tiny-lightbox-slideshow-running');
                        };
                    });
                });
            });

            return false;

        });
    };

    this.showNext = function() {
        change(activeIndex + 1);
    };

    this.showPrev = function() {
        change(activeIndex-1);
    };

    this.slideshow = function(sw) {
        if (running && !sw) {
            clearTimeout(running);
            cycle = o.cycle;
            self.$bar.removeClass('tiny-lightbox-slideshow-running');
            running = false;
        } else {
            cycle = true;
            self.$bar.addClass('tiny-lightbox-slideshow-running');
            change(activeIndex + 1, function(){
                running = setTimeout(function(){
                    self.slideshow(true);
                }, o.slideshowSpeed);
            });
        }
    };

    this.close = function()    {
        clearTimeout(running);
        $prevNext.unbind('mouseover mouseout');
        $(window).unbind('resize scroll', resizeOverlay);
        o.keyNavigation && $(document).unbind('keydown', keyNavigation);
        animations.close(function(){
            self.$tl.unbind('click').remove();
            delete self.$tl;
        });
    };


    function resizeOverlay() {
        self.docData = {
            width: $(window).width(),
            height: $(document).height(),
            scrollTop: $(window).scrollTop(),
            scrollLeft: $(window).scrollLeft()
        };
        self.$tl.add(self.$overlay).css({height: self.docData.height, width: self.docData.width});
    }

    function keyNavigation(e) {
        /* 39 -> 37 <- 27 esc */
        switch(e.keyCode) {
            case 39:
                self.showNext();
                break;
            case 37:
                self.showPrev();
                break;
            case 27:
                self.close();
        }
    }

    function preload(url, callback) {
        self.$tl.addClass('tiny-lightbox-loading');
        var img = new Image();
        img.onload = function() {
            self.$tl.removeClass('tiny-lightbox-loading');
            $.extend(self.boxData, {
                width: img.width>o.minWidth ? img.width : o.minWidth,
                height: img.height>o.minHeight ? img.height : o.minHeight
            });
            setLeft();
            callback();
        };
        img.src = self.path = url;
    }

    function setLeft() {
        self.boxData.left = (self.docData.width - (self.boxData.width  +  self.boxData.borderWidth*2))/2;
    }

    function updateBar() {
        $stats.text(o.labelImage + ' ' + (activeIndex + 1) + ' ' + o.labelOf + ' ' + $elems.length);
        var descr = $elems.eq(activeIndex).attr(o.descrAttr);
        $descr.html(descr)[ descr ? 'show' : 'hide' ]();
    }

    function change(id, callback) {
        if (self.$tl.hasClass('tiny-lightbox-animating')) return;

        if (id > $elems.length-1 || id < 0) {
            if (cycle) {
                change(id < 0 ? $elems.length-1 : 0, callback);
            } else {
                self.$tl.addClass('tiny-lightbox-animating');
                animations.limit(function(){
                    self.$tl.removeClass('tiny-lightbox-animating');
                });
            }
            return;
        }

        activeIndex = id;

        self.$tl.addClass('tiny-lightbox-animating');
        animations.prepare(function(){
            preload($elems.eq(activeIndex).attr(o.pathAttr), function(){
                updateBar();
                animations.animate(function(){
                    self.$tl.removeClass('tiny-lightbox-animating');
                    resizeOverlay();
                    $(callback);
                });
            });
        });
    }
}

}(jQuery, window, document));
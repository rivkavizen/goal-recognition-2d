/**
 * jspsych-free-sort
 * plugin for drag-and-drop sorting of a collection of images
 * Josh de Leeuw
 *
 * documentation: docs.jspsych.org
 */

jsPsych.plugins['free-sort'] = (function () {
  var plugin = {};

  // jsPsych.pluginAPI.registerPreload('free-sort', 'stim_path', 'image');

  plugin.info = {
    name: 'free-sort',
    description: '',
    parameters: {
      stim_path: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Stimuli path',
        default: undefined,
        description: 'path to item to be displayed.',
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: '',
        description:
          'It can be used to provide a reminder about the action the subject is supposed to take.',
      },
      prompt_location: {
        type: jsPsych.plugins.parameterType.SELECT,
        pretty_name: 'Prompt location',
        options: ['above', 'below'],
        default: 'above',
        description:
          'Indicates whether to show prompt "above" or "below" the sorting area.',
      },
      button_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button label',
        default: 'Continue',
        description:
          'The text that appears on the button to continue to the next trial.',
      },
    },
  };

  plugin.trial = function (display_element, trial) {
    var start_time = performance.now();
    var init_locations;
    var startPositions = [];
    var moves = [];
    var endPositions;

    let html =
      '<div ' +
      'id="jspsych-free-sort-arena" ' +
      'class="jspsych-free-sort-arena" ' +
      'style="position: relative; margin: auto; border: 1px solid black"></div>';

    // variable that has the prompt text and counter
    const html_text =
      '<div style="line-height: 1.0em;">' + trial.prompt + '</div>';

    // position prompt above or below
    if (trial.prompt_location == 'below') {
      html += html_text;
    } else {
      html = html_text + html;
    }

    // add button
    html +=
      '<div><button id="jspsych-free-sort-done-btn" class="jspsych-btn" ' +
      'style="margin-top: 5px; margin-bottom: 15px;">' +
      trial.button_label +
      '</button></div>';

    display_element.innerHTML = html;

    var arena = display_element.querySelector('#jspsych-free-sort-arena');
    arena.innerHTML += '<div id="svg-placeholder"></div>';
    var svgPlaceholder = display_element.querySelector('#svg-placeholder');
    // var didSvgOnloadRan = false;
    fetchSvg(trial.stim_path);

    function fetchSvg(url) {
      fetch(trial.stim_path)
        .then((r) => r.text())
        .then((svgText) => initSvg(svgText));
    }

    function initSvg(svgText) {
      svgPlaceholder.innerHTML = svgText;
      const svg = svgPlaceholder.children[0];
      // svg.onload = svgOnloadFunc;
      // if (!didSvgOnloadRan) {
      //   makeDraggable(svg);
      // }
      init_locations = getLocations(svg);
      makeDraggable(svg);
    }

    function getLocations(svg) {
      const results = [];
      const children = svg.children;
      for (var i = 0; i < children.length; i++) {
        if (children[i].id != '') {
          const id = children[i].id;
          const childBbox = children[i].getBBox();
          results.push({
            src: id,
            x: parseInt(childBbox.x),
            y: parseInt(childBbox.y),
          });
        }
      }
      return results;
    }

    function svgOnloadFunc(evt) {
      console.log('initMakeDraggable called');
      didSvgOnloadRan = true;
      var svg = evt.target;
      makeDraggable(svg);
    }

    function makeDraggable(svg) {
      // var svg = evt.target;

      svg.addEventListener('mousedown', startDrag);
      svg.addEventListener('mousemove', drag);
      svg.addEventListener('mouseup', endDrag);
      svg.addEventListener('mouseleave', endDrag);
      svg.addEventListener('touchstart', startDrag);
      svg.addEventListener('touchmove', drag);
      svg.addEventListener('touchend', endDrag);
      svg.addEventListener('touchleave', endDrag);
      svg.addEventListener('touchcancel', endDrag);

      var selectedElement, offset, transform, bbox, minX, maxX, minY, maxY;

      let svgBoundingRect = svgPlaceholder.children[0].getBoundingClientRect();
      var boundaryX1 = 0;
      var boundaryX2 = svgBoundingRect.width;
      var boundaryY1 = 0;
      var boundaryY2 = svgBoundingRect.height;

      function getMousePosition(evt) {
        var CTM = svg.getScreenCTM();
        if (evt.touches) {
          evt = evt.touches[0];
        }
        return {
          x: (evt.clientX - CTM.e) / CTM.a,
          y: (evt.clientY - CTM.f) / CTM.d,
        };
      }

      function startDrag(evt) {
        if (evt.target.parentElement.id === 'dynamic') {
          selectedElement = evt.target;
          offset = getMousePosition(evt);

          // Make sure the first transform on the element is a translate transform
          var transforms = selectedElement.transform.baseVal;

          if (
            transforms.length === 0 ||
            transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE
          ) {
            // Create an transform that translates by (0, 0)
            var translate = svg.createSVGTransform();
            translate.setTranslate(0, 0);
            selectedElement.transform.baseVal.insertItemBefore(translate, 0);
          }

          // Get initial translation
          transform = transforms.getItem(0);
          let e = transform.matrix.e;
          let f = transform.matrix.f;

          offset.x -= e;
          offset.y -= f;

          bbox = selectedElement.parentElement.getBBox();
          minX = boundaryX1 - bbox.x + e;
          maxX = boundaryX2 - bbox.x - bbox.width + e;
          minY = boundaryY1 - bbox.y + f;
          maxY = boundaryY2 - bbox.y - bbox.height + f;
        }
      }

      function drag(evt) {
        if (selectedElement) {
          evt.preventDefault();

          var coord = getMousePosition(evt);
          var dx = coord.x - offset.x;
          var dy = coord.y - offset.y;
          if (dx < minX) {
            dx = minX;
          } else if (dx > maxX) {
            dx = maxX;
          }
          if (dy < minY) {
            dy = minY;
          } else if (dy > maxY) {
            dy = maxY;
          }

          transform.setTranslate(dx, dy);
        }
      }

      // function endDrag(evt) {
      //   selectedElement = false;
      // }

      function endDrag(evt) {
        if (selectedElement) {
          const endBbox = selectedElement.parentElement.getBBox();
          moves.push({
            src: 'dynamic',
            x: parseInt(endBbox.x),
            y: parseInt(endBbox.y),
          });
          selectedElement = false;
        }
      }
    }

    display_element
      .querySelector('#jspsych-free-sort-done-btn')
      .addEventListener('click', function () {
        const end_time = performance.now();
        const rt = end_time - start_time;
        // gather data
        const items = display_element.querySelectorAll(
          '.jspsych-free-sort-draggable'
        );
        // get final position of all items

        const final_locations = getLocations(svgPlaceholder.children[0]);

        const trial_data = {
          init_locations: init_locations,
          moves: moves,
          final_locations: final_locations,
          rt: rt,
        };

        // advance to next part
        display_element.innerHTML = '';
        jsPsych.finishTrial(trial_data);
      });

    //----------------------------------------------------------------------

    // // store initial location data
    // let init_locations = [];

    // let inside = [];
    // for (let i = 0; i < trial.stimuli.length; i++) {
    //   var coords;
    //   if (trial.stim_starts_inside) {
    //     coords = random_coordinate(
    //       trial.sort_area_width - trial.stim_width,
    //       trial.sort_area_height - trial.stim_height
    //     );
    //   } else {
    //     if (i % 2 == 0) {
    //       coords = r_coords[Math.floor(i * 0.5)];
    //     } else {
    //       coords = l_coords[Math.floor(i * 0.5)];
    //     }
    //   }

    //   display_element.querySelector('#jspsych-free-sort-arena').innerHTML +=
    //     '<img ' +
    //     'src="' +
    //     trial.stimuli[i] +
    //     '" ' +
    //     'data-src="' +
    //     trial.stimuli[i] +
    //     '" ' +
    //     'class="jspsych-free-sort-draggable" ' +
    //     'draggable="false" ' +
    //     'id="jspsych-free-sort-draggable-' +
    //     i +
    //     '" ' +
    //     'style="position: absolute; cursor: move; width:' +
    //     trial.stim_width +
    //     'px; height:' +
    //     trial.stim_height +
    //     'px; top:' +
    //     coords.y +
    //     'px; left:' +
    //     coords.x +
    //     'px;">' +
    //     '</img>';

    //   init_locations.push({
    //     src: trial.stimuli[i],
    //     x: coords.x,
    //     y: coords.y,
    //   });
    //   if (trial.stim_starts_inside) {
    //     inside.push(true);
    //   } else {
    //     inside.push(false);
    //   }
    // }

    // // moves within a trial
    // let moves = [];

    // // are objects currently inside
    // let cur_in = false;

    // // draggable items
    // const draggables = display_element.querySelectorAll(
    //   '.jspsych-free-sort-draggable'
    // );

    // // button (will show when all items are inside) and border (will change color)
    // const border = display_element.querySelector('#jspsych-free-sort-border');
    // const button = display_element.querySelector('#jspsych-free-sort-done-btn');

    // // when trial starts, modify text and border/background if all items are inside (stim_starts_inside: true)
    // if (inside.some(Boolean) && trial.change_border_background_color) {
    //   border.style.borderColor = trial.border_color_in;
    // }
    // if (inside.every(Boolean)) {
    //   if (trial.change_border_background_color) {
    //     border.style.background = trial.border_color_in;
    //   }
    //   button.style.visibility = 'visible';
    //   display_element.querySelector('#jspsych-free-sort-counter').innerHTML =
    //     trial.counter_text_finished;
    // }

    // let start_event_name = 'mousedown';
    // let move_event_name = 'mousemove';
    // let end_event_name = 'mouseup';
    // if (typeof document.ontouchend !== 'undefined') {
    //   // for touch devices
    //   start_event_name = 'touchstart';
    //   move_event_name = 'touchmove';
    //   end_event_name = 'touchend';
    // }

    // for (let i = 0; i < draggables.length; i++) {
    //   draggables[i].addEventListener(start_event_name, function (event) {
    //     let pageX = event.pageX;
    //     let pageY = event.pageY;
    //     if (typeof document.ontouchend !== 'undefined') {
    //       // for touch devices
    //       event.preventDefault();
    //       const touchObject = event.changedTouches[0];
    //       pageX = touchObject.pageX;
    //       pageY = touchObject.pageY;
    //     }

    //     let x = pageX - event.currentTarget.offsetLeft;
    //     let y = pageY - event.currentTarget.offsetTop - window.scrollY;
    //     let elem = event.currentTarget;
    //     elem.style.transform =
    //       'scale(' + trial.scale_factor + ',' + trial.scale_factor + ')';

    //     let move_event = function (e) {
    //       let clientX = e.clientX;
    //       let clientY = e.clientY;
    //       if (typeof document.ontouchend !== 'undefined') {
    //         // for touch devices
    //         const touchObject = e.changedTouches[0];
    //         clientX = touchObject.clientX;
    //         clientY = touchObject.clientY;
    //       }

    //       cur_in = inside_ellipse(
    //         clientX - x,
    //         clientY - y,
    //         trial.sort_area_width * 0.5 - trial.stim_width * 0.5,
    //         trial.sort_area_height * 0.5 - trial.stim_height * 0.5,
    //         trial.sort_area_width * 0.5,
    //         trial.sort_area_height * 0.5,
    //         trial.sort_area_shape == 'square'
    //       );
    //       elem.style.top =
    //         Math.min(
    //           trial.sort_area_height - trial.stim_height * 0.5,
    //           Math.max(-trial.stim_height * 0.5, clientY - y)
    //         ) + 'px';
    //       elem.style.left =
    //         Math.min(
    //           trial.sort_area_width * 1.5 - trial.stim_width,
    //           Math.max(-trial.sort_area_width * 0.5, clientX - x)
    //         ) + 'px';

    //       // modify border while items is being moved
    //       if (trial.change_border_background_color) {
    //         if (cur_in) {
    //           border.style.borderColor = trial.border_color_in;
    //           border.style.background = 'None';
    //         } else {
    //           border.style.borderColor = trial.border_color_out;
    //           border.style.background = 'None';
    //         }
    //       }

    //       // replace in overall array, grab index from item id
    //       var elem_number = elem.id.split('jspsych-free-sort-draggable-')[1];
    //       inside.splice(elem_number, true, cur_in);

    //       // modify text and background if all items are inside
    //       if (inside.every(Boolean)) {
    //         if (trial.change_border_background_color) {
    //           border.style.background = trial.border_color_in;
    //         }
    //         button.style.visibility = 'visible';
    //         display_element.querySelector(
    //           '#jspsych-free-sort-counter'
    //         ).innerHTML = trial.counter_text_finished;
    //       } else {
    //         border.style.background = 'none';
    //         button.style.visibility = 'hidden';
    //         display_element.querySelector(
    //           '#jspsych-free-sort-counter'
    //         ).innerHTML = get_counter_text(
    //           inside.length - inside.filter(Boolean).length
    //         );
    //       }
    //     };
    //     document.addEventListener(move_event_name, move_event);

    //     var end_event = function (e) {
    //       document.removeEventListener(move_event_name, move_event);
    //       elem.style.transform = 'scale(1, 1)';
    //       if (trial.change_border_background_color) {
    //         if (inside.every(Boolean)) {
    //           border.style.background = trial.border_color_in;
    //           border.style.borderColor = trial.border_color_in;
    //         } else {
    //           border.style.background = 'none';
    //           border.style.borderColor = trial.border_color_out;
    //         }
    //       }
    //       moves.push({
    //         src: elem.dataset.src,
    //         x: elem.offsetLeft,
    //         y: elem.offsetTop,
    //       });
    //       document.removeEventListener(end_event_name, end_event);
    //     };
    //     document.addEventListener(end_event_name, end_event);
    //   });
    // }

    // display_element
    //   .querySelector('#jspsych-free-sort-done-btn')
    //   .addEventListener('click', function () {
    //     if (inside.every(Boolean)) {
    //       const end_time = performance.now();
    //       const rt = end_time - start_time;
    //       // gather data
    //       const items = display_element.querySelectorAll(
    //         '.jspsych-free-sort-draggable'
    //       );
    //       // get final position of all items
    //       let final_locations = [];
    //       for (let i = 0; i < items.length; i++) {
    //         final_locations.push({
    //           src: items[i].dataset.src,
    //           x: parseInt(items[i].style.left),
    //           y: parseInt(items[i].style.top),
    //         });
    //       }

    //       const trial_data = {
    //         init_locations: init_locations,
    //         moves: moves,
    //         final_locations: final_locations,
    //         rt: rt,
    //       };

    //       // advance to next part
    //       display_element.innerHTML = '';
    //       jsPsych.finishTrial(trial_data);
    //     }
    //   });
  };

  return plugin;
})();

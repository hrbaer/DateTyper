/*
  Date Typer

  Navigation in time space by typing, dragging and scrolling.

  Author
  H. R. Baer
  hbaer@ethz.ch

  Version 1
  11.09.2015
*/

+function(global) {

  "use strict";

  // D A T E  T Y P E R

  var dateTyper = function(selector, dateFormatter) {

    // HTML text input element selector for the date.
    var dateTyperInput = document.querySelector(selector);

    // The function that formats a date.
    dateFormatter = dateFormatter || function(date) { return date.toString(); };

    // Regular expression used to split a date string.
    var separator = /[\.\-\/:,\s]+/g;

    // Object holding the results of the learned date format.
    var memory = { index: [], months: [] };

    // Number of pixels for one unit.
    var pixelsPerUnit = 5;

    // The updated date.
    var upDate;

    // The selected field index.
    var currentField = 0;


    // Make sure Array's find and findIndex methods are available
    if (!Array.prototype.findIndex) {
      Array.prototype.findIndex = function(cb) {
        for (var i = 0; i < this.length; ++i) {
          if (cb(this[i], i, this)) {
            return i;
          }
        }
        return -1;
      }
    }

    if (!Array.prototype.find) {
      Array.prototype.find = function(cb) {
        return this[this.findIndex(cb)];
      }
    }

    // Splits a date string into its components.
    function splitDate(dateString) {
      return dateString.split(separator);
    }

    // Returns the field for a given name.
    function findFieldByName(name) {
      return memory.index.find(function(field) { return field.name === name; });
    }

    // Returns the field for the given index.
    function findFieldByIndex(index) {
      return memory.index.find(function(field) { return field.index === index; });
    }

    // Analyzes a date string and stores the current date values.
    function analyzeDate(dateString) {
      var fields = splitDate(dateString);
      memory.index.forEach(function(v) {
        switch (v.name) {
        case 'month':
          var value = fields[v.index]
          if (+value) {
            v.value = +value - 1;
          }
          else {
            var month = memory.months.find(function(m) { return m.name.match(new RegExp('^' + value, 'i')); });
            if (month) {
              v.value = month.value;
            }
          }
          break;
        default:
          v.value = +fields[v.index];
          break;
        }
      })
    }

    // Recreates the date string from the current date values.
    function updateDate() {
      upDate = new Date(0);
      memory.index.forEach(function(v) {
        v.update(upDate, v.value);
      });
      upDate = isNaN(upDate.valueOf()) ? new Date() : upDate;
      dateTyperInput.value = dateFormatter(upDate);
    }


    // L E A R N
    // Empirically learns the fields of a date string.
    function learn() {

      // Creates an array of the components of a date string.
      function createTestFields(year, month, day, hour, min, sec) {
        return splitDate(dateFormatter(new Date(year, month, day, hour, min, sec)));
      }

      // Determine the fields of the date
      var testValues1 = [2001, 1, 1, 10, 34, 56];
      var testValues2 = [2001, 1, 1, 11, 34, 56];
      var testValues3 = [2001, 2, 1, 10, 34, 56];

      // Array resonsible for the proper handling of date components.
      var fields = [
        { name: 'year' , pos: 0, update: function(date, value) { date.setFullYear(value); } },
        { name: 'min'  , pos: 4, update: function(date, value) { date.setMinutes(value); } },
        { name: 'sec'  , pos: 5, update: function(date, value) { date.setSeconds(value); } },
        { name: 'day'  , pos: 2, update: function(date, value) { date.setDate(value); } },
        { name: 'hour' , pos: 3, update: function(date, value) { date.setHours(value); } },
        { name: 'month', pos: 1, update: function(date, value) { date.setMonth(value); } }
      ];

      // Three test date strings used to determine the components of the date string.
      function testFields(tv1, tv2, tv3) {
        var tf1 = createTestFields.apply(null, tv1);
        var tf2 = createTestFields.apply(null, tv2);
        var tf3 = createTestFields.apply(null, tv3);
        var t1 = function(field) { return tf1.findIndex(function(v) { return !field.index && tv1[field.pos] === +v }) };
        var t2 = function(field) { return tf1.findIndex(function(v, i) { return !field.index && tf2[i] - v == 1}) };
        var t3 = function(field) { return tf1.findIndex(function(v, i) { return !field.index && tf3[i] != v }) };

        return function(fields) {
          fields.forEach(function(field) {
            switch (field.name) {
            case 'hour':
              field.index = t2(field);
              break;
            case 'month':
              field.index = t3(field);
              break;
            default:
              field.index = t1(field);
              break;
            }
            if (field.index >= 0) {
              memory.index.push(field);
            }
          });
        }

      }

      // Actually determines the date components and sorts the results by ascending indices.
      var test = testFields(testValues1, testValues2, testValues3);
      test(fields);
      memory.index.sort(function(a, b) {
        return a.index - b.index;
      });

      // Extract the names of the months.
      var monthField = findFieldByName('month');
      if (monthField) {
        var monthIndex = monthField.index;
        for (var month = 0; month < 12; month += 1) {
          testValues1[1] = month;
          var testFields = createTestFields.apply(null, testValues1);
          memory.months.push({ name: testFields[monthIndex], value: month })
        }
      }

    }

    learn();

    // Dispatches a change event. 
    function dispatchChangeEvent(value) {
      var evt = new CustomEvent('change', {
        detail: {
          valueAsDate: value,
          valueAsNumber: value.valueOf()
        }
      });
      dateTyperInput.dispatchEvent(evt);
    }
    
    // Initial date: uses either HTML's data attribute or the current date.
    var date = dateTyperInput.dataset.date ? new Date(+dateTyperInput.dataset.date) : new Date();
    dateTyperInput.value = dateFormatter(date);
    dateTyperInput.spellcheck = false;

    // Shows the specified selection.
    function showSelection(field, start, end) {
      field.setSelectionRange(start, end);
    }

    // Selects the currently active date component.
    function selectField(input) {
      createFieldSpans(input);
      var numFields = memory.index.length;
      currentField = (currentField + numFields) % numFields;
      var span = memory.index[currentField];
      showSelection(input, span.from, span.to);
    }

    // Creates spans for each date component.
    function createFieldSpans(input) {
      var match, from = 0, to, spans = [];
      var i = 0;
      while ((match = separator.exec(input.value)) != null) {
        to = match.index;
        spans.push([from, to]);
        from = to + match[0].length;
        i += 1;
      }
      spans.push([from, input.value.length]);
      memory.index.forEach(function(v, i) {
        v.from = spans[v.index][0];
        v.to = spans[v.index][1];
      })
    }

    // Selects field from current cursor position
    function choseDateComponent(input) {
      var start = input.selectionStart;
      createFieldSpans(input);
      memory.index.forEach(function(v, i) {
        if (v.from <= start && start <= v.to + 1) {
          showSelection(input, v.from, v.to);
          currentField = i;
        }
      });
    }

    // Increases or decreases the selected date component.
    function changeDateComponent(input, value) {
      analyzeDate(input.value);
      var field = memory.index[currentField];
      field.value += value;
      updateDate();
      selectField(input);
      dispatchChangeEvent(upDate);
    }

    // Move the date component selection.
    function moveDateComponent(input, value) {
      currentField += value;
      selectField(input);
    }

    // EVENT HANDLING
    
    // Handles key-down events.
    dateTyperInput.addEventListener('keydown', function(evt) {

      var text = this.value, start = this.selectionStart, end = this.selectionEnd;
      var selectedText = text.substring(start, end);
      var key = evt.keyCode || evt.which;
      
      switch(key) {

        // Moves selection to next field on the right.
        case 39:
        case 190:
          moveDateComponent(this, +1);
          evt.preventDefault();
          break;

        // Moves selection to next field on the left.
        case 37:
        case 188:
          moveDateComponent(this, -1);
          evt.preventDefault();
          break;

        // Increases the selected date component value.
        case 38:
        case 53:
          changeDateComponent(this, +1);
          evt.preventDefault();
          break;

        // Decreases the selected date component value.
        case 40:
        case 191:
          changeDateComponent(this, -1);
          evt.preventDefault();
          break;

        // Updates on pressing enter.
        case 13:
          analyzeDate(this.value);
          updateDate();
          dispatchChangeEvent(upDate);
          selectField(this);
          evt.preventDefault();
          break;

      }

    });

    var lastPos, dragEnabled = false;

    // Shows date selection on mouse up
    dateTyperInput.addEventListener('mouseup', function(evt) {
      choseDateComponent(this);
      evt.preventDefault();
    });
    
    // Changes the date component by wheel action.
    dateTyperInput.addEventListener('wheel', function(evt) {
      var delta = evt.deltaX | evt.deltaY;
      changeDateComponent(this, delta / Math.abs(delta));
      evt.preventDefault();
    });
    
    dateTyperInput.addEventListener("touchstart", function(evt) {
      var touch = event.touches[0];
      lastPos = { x: touch.screenX, y: touch.screenY };
      selectField(this);
    });
    
    dateTyperInput.addEventListener("touchend", function(evt) {
      setTimeout(function() {
        choseDateComponent(dateTyperInput);
      }, 100);
    });
    
    dateTyperInput.addEventListener("touchmove", function(evt) {
      var touch = event.touches[0];
      var dy = ((lastPos.y - touch.screenY) / pixelsPerUnit) | 0;
      if (dy != 0) {
        changeDateComponent(this, dy);
        lastPos.y = touch.screenY;
      }
      evt.preventDefault();
    });
    
    // Initializes drag and drop.
    dateTyperInput.addEventListener('dragstart', function(evt) {
      lastPos = { x: evt.screenX, y: evt.screenY };
      dragEnabled = true;
    });

    // Changes date component when dragging a field.
    dateTyperInput.addEventListener('drag', function(evt) {
      if (dragEnabled && evt.screenX != 0 && evt.screenY != 0) {
        var dy = ((lastPos.y - evt.screenY) / pixelsPerUnit) | 0;
        if (dy != 0) {
          changeDateComponent(this, dy);
          lastPos.y = evt.screenY;
        }
      }
      evt.preventDefault();
    });

    // Disables drop action
    dateTyperInput.addEventListener('drop', function(evt) {
      evt.preventDefault();
    });
    
    dateTyper.domElement = dateTyperInput;

    return dateTyper;
  }

  global.dateTyper = dateTyper;

}(window);

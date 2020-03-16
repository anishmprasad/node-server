function diffDays(m0, m1) {
  return (m1.valueOf() - m0.valueOf()) / (1000 * 60 * 60 * 24);
}

function getDateDayIndex(date) {
  var indices = this.indices;
  var dayOffset = Math.floor(diffDays(this.dates[0], date));
  if (dayOffset < 0) {
    return indices[0] - 1;
  } else if (dayOffset >= indices.length) {
    return indices[indices.length - 1] + 1;
  } else {
    return indices[dayOffset];
  }
}

function DaySeriesSliceRange(range) {
  var firstIndex = getDateDayIndex(range.start); // inclusive first index
  var lastIndex = getDateDayIndex(addDays(range.end, -1)); // inclusive last index
  var clippedFirstIndex = Math.max(0, firstIndex);
  var clippedLastIndex = Math.min(this.cnt - 1, lastIndex);
  // deal with in-between indices
  clippedFirstIndex = Math.ceil(clippedFirstIndex); // in-between starts round to next cell
  clippedLastIndex = Math.floor(clippedLastIndex); // in-between ends round to prev cell
  if (clippedFirstIndex <= clippedLastIndex) {
    return {
      firstIndex: clippedFirstIndex,
      lastIndex: clippedLastIndex,
      isStart: firstIndex === clippedFirstIndex,
      isEnd: lastIndex === clippedLastIndex
    };
  } else {
    return null;
  }
}

function sliceRange(range) {
  var colCnt = this.colCnt || 7;
  var seriesSeg = DaySeriesSliceRange(range);
  var segs = [];
  if (seriesSeg) {
    var firstIndex = seriesSeg.firstIndex,
      lastIndex = seriesSeg.lastIndex;
    var index = firstIndex;
    while (index <= lastIndex) {
      var row = Math.floor(index / colCnt);
      var nextIndex = Math.min((row + 1) * colCnt, lastIndex + 1);
      segs.push({
        row: row,
        firstCol: index % colCnt,
        lastCol: (nextIndex - 1) % colCnt,
        isStart: seriesSeg.isStart && index === firstIndex,
        isEnd: seriesSeg.isEnd && nextIndex - 1 === lastIndex
      });
      index = nextIndex;
    }
  }
  console.log({ segs });
  return segs;
}

function DaySeries(range, dateProfileGenerator) {
  console.log(dateProfileGenerator);
  var date = range.start;
  var end = range.end;
  var indices = [];
  var dates = [];
  var dayIndex = -1;
  while (date < end) {
    // loop each day from start to end
    if (dateProfileGenerator.isHiddenDay(date)) {
      indices.push(dayIndex + 0.5); // mark that it's between indices
    } else {
      dayIndex++;
      indices.push(dayIndex);
      dates.push(date);
    }
    date = addDays(date, 1);
  }
  this.dates = dates;
  this.indices = indices;
  this.cnt = dates.length;

  console.log(sliceRange(range));
}

function addDays(m, n) {
  var a = dateToUtcArray(m);
  a[2] += n;
  return arrayToUtcDate(a);
}

function dateToUtcArray(date) {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ];
}
function arrayToUtcDate(a) {
  // according to web standards (and Safari), a month index is required.
  // massage if only given a year.
  if (a.length === 1) {
    a = a.concat([0]);
  }
  return new Date(Date.UTC.apply(Date, a));
}

class DateProfileGenerator {
  constructor() {
    //   this.viewSpec = viewSpec;
    //   this.options = viewSpec.options;
    //   this.dateEnv = calendar.dateEnv;
    //   this.calendar = calendar;
    //   console.log(this);
    this.initHiddenDays();
  }

  /* Date Range Computation
------------------------------------------------------------------------------------------------------------------*/
  // Builds a structure with info about what the dates/ranges will be for the "prev" view.
  buildPrev = (currentDateProfile, currentDate) => {
    var dateEnv = this.dateEnv;
    var prevDate = dateEnv.subtract(
      dateEnv.startOf(currentDate, currentDateProfile.currentRangeUnit), // important for start-of-month
      currentDateProfile.dateIncrement
    );
    return this.build(prevDate, -1);
  };
  // Builds a structure with info about what the dates/ranges will be for the "next" view.
  buildNext = (currentDateProfile, currentDate) => {
    var dateEnv = this.dateEnv;
    var nextDate = dateEnv.add(
      dateEnv.startOf(currentDate, currentDateProfile.currentRangeUnit), // important for start-of-month
      currentDateProfile.dateIncrement
    );
    return this.build(nextDate, 1);
  };
  // Builds a structure holding dates/ranges for rendering around the given date.
  // Optional direction param indicates whether the date is being incremented/decremented
  // from its previous value. decremented = -1, incremented = 1 (default).
  build = (currentDate, direction, forceToValid) => {
    if (forceToValid === void 0) {
      forceToValid = false;
    }
    var validRange;
    var minTime = null;
    var maxTime = null;
    var currentInfo;
    var isRangeAllDay;
    var renderRange;
    var activeRange;
    var isValid;
    validRange = this.buildValidRange();
    validRange = this.trimHiddenDays(validRange);
    if (forceToValid) {
      currentDate = constrainMarkerToRange(currentDate, validRange);
    }
    currentInfo = this.buildCurrentRangeInfo(currentDate, direction);
    isRangeAllDay = /^(year|month|week|day)$/.test(currentInfo.unit);
    renderRange = this.buildRenderRange(
      this.trimHiddenDays(currentInfo.range),
      currentInfo.unit,
      isRangeAllDay
    );
    renderRange = this.trimHiddenDays(renderRange);
    activeRange = renderRange;
    if (!this.options.showNonCurrentDates) {
      activeRange = intersectRanges(activeRange, currentInfo.range);
    }
    minTime = createDuration(this.options.minTime);
    maxTime = createDuration(this.options.maxTime);
    activeRange = this.adjustActiveRange(activeRange, minTime, maxTime);
    activeRange = intersectRanges(activeRange, validRange); // might return null
    // it's invalid if the originally requested date is not contained,
    // or if the range is completely outside of the valid range.
    isValid = rangesIntersect(currentInfo.range, validRange);
    return {
      // constraint for where prev/next operations can go and where events can be dragged/resized to.
      // an object with optional start and end properties.
      validRange: validRange,
      // range the view is formally responsible for.
      // for example, a month view might have 1st-31st, excluding padded dates
      currentRange: currentInfo.range,
      // name of largest unit being displayed, like "month" or "week"
      currentRangeUnit: currentInfo.unit,
      isRangeAllDay: isRangeAllDay,
      // dates that display events and accept drag-n-drop
      // will be `null` if no dates accept events
      activeRange: activeRange,
      // date range with a rendered skeleton
      // includes not-active days that need some sort of DOM
      renderRange: renderRange,
      // Duration object that denotes the first visible time of any given day
      minTime: minTime,
      // Duration object that denotes the exclusive visible end time of any given day
      maxTime: maxTime,
      isValid: isValid,
      // how far the current date will move for a prev/next operation
      dateIncrement: this.buildDateIncrement(currentInfo.duration)
      // pass a fallback (might be null) ^
    };
  };
  // Builds an object with optional start/end properties.
  // Indicates the minimum/maximum dates to display.
  // not responsible for trimming hidden days.
  buildValidRange = () => {
    return (
      this.getRangeOption("validRange", this.calendar.getNow()) || {
        start: null,
        end: null
      }
    ); // completely open-ended
  };
  // Builds a structure with info about the "current" range, the range that is
  // highlighted as being the current month for example.
  // See build() for a description of `direction`.
  // Guaranteed to have `range` and `unit` properties. `duration` is optional.
  buildCurrentRangeInfo = (date, direction) => {
    var _a = this,
      viewSpec = _a.viewSpec,
      dateEnv = _a.dateEnv;
    var duration = null;
    var unit = null;
    var range = null;
    var dayCount;
    if (viewSpec.duration) {
      duration = viewSpec.duration;
      unit = viewSpec.durationUnit;
      range = this.buildRangeFromDuration(date, direction, duration, unit);
    } else if ((dayCount = this.options.dayCount)) {
      unit = "day";
      range = this.buildRangeFromDayCount(date, direction, dayCount);
    } else if ((range = this.buildCustomVisibleRange(date))) {
      unit = dateEnv.greatestWholeUnit(range.start, range.end).unit;
    } else {
      duration = this.getFallbackDuration();
      unit = greatestDurationDenominator(duration).unit;
      range = this.buildRangeFromDuration(date, direction, duration, unit);
    }
    return { duration: duration, unit: unit, range: range };
  };
  getFallbackDuration = () => {
    return createDuration({ day: 1 });
  };
  // Returns a new activeRange to have time values (un-ambiguate)
  // minTime or maxTime causes the range to expand.
  adjustActiveRange = (range, minTime, maxTime) => {
    var dateEnv = this.dateEnv;
    var start = range.start;
    var end = range.end;
    if (this.viewSpec.class.prototype.usesMinMaxTime) {
      // expand active range if minTime is negative (why not when positive?)
      if (asRoughDays(minTime) < 0) {
        start = startOfDay(start); // necessary?
        start = dateEnv.add(start, minTime);
      }
      // expand active range if maxTime is beyond one day (why not when positive?)
      if (asRoughDays(maxTime) > 1) {
        end = startOfDay(end); // necessary?
        end = addDays(end, -1);
        end = dateEnv.add(end, maxTime);
      }
    }
    return { start: start, end: end };
  };
  // Builds the "current" range when it is specified as an explicit duration.
  // `unit` is the already-computed greatestDurationDenominator unit of duration.
  buildRangeFromDuration = (date, direction, duration, unit) => {
    var dateEnv = this.dateEnv;
    var alignment = this.options.dateAlignment;
    var dateIncrementInput;
    var dateIncrementDuration;
    var start;
    var end;
    var res;
    // compute what the alignment should be
    if (!alignment) {
      dateIncrementInput = this.options.dateIncrement;
      if (dateIncrementInput) {
        dateIncrementDuration = createDuration(dateIncrementInput);
        // use the smaller of the two units
        if (asRoughMs(dateIncrementDuration) < asRoughMs(duration)) {
          alignment = greatestDurationDenominator(
            dateIncrementDuration,
            !getWeeksFromInput(dateIncrementInput)
          ).unit;
        } else {
          alignment = unit;
        }
      } else {
        alignment = unit;
      }
    }
    // if the view displays a single day or smaller
    if (asRoughDays(duration) <= 1) {
      if (this.isHiddenDay(start)) {
        start = this.skipHiddenDays(start, direction);
        start = startOfDay(start);
      }
    }
    function computeRes() {
      start = dateEnv.startOf(date, alignment);
      end = dateEnv.add(start, duration);
      res = { start: start, end: end };
    }
    computeRes();
    // if range is completely enveloped by hidden days, go past the hidden days
    if (!this.trimHiddenDays(res)) {
      date = this.skipHiddenDays(date, direction);
      computeRes();
    }
    return res;
  };
  // Builds the "current" range when a dayCount is specified.
  buildRangeFromDayCount = (date, direction, dayCount) => {
    var dateEnv = this.dateEnv;
    var customAlignment = this.options.dateAlignment;
    var runningCount = 0;
    var start = date;
    var end;
    if (customAlignment) {
      start = dateEnv.startOf(start, customAlignment);
    }
    start = startOfDay(start);
    start = this.skipHiddenDays(start, direction);
    end = start;
    do {
      end = addDays(end, 1);
      if (!this.isHiddenDay(end)) {
        runningCount++;
      }
    } while (runningCount < dayCount);
    return { start: start, end: end };
  };
  // Builds a normalized range object for the "visible" range,
  // which is a way to define the currentRange and activeRange at the same time.
  buildCustomVisibleRange = date => {
    var dateEnv = this.dateEnv;
    var visibleRange = this.getRangeOption(
      "visibleRange",
      dateEnv.toDate(date)
    );
    if (
      visibleRange &&
      (visibleRange.start == null || visibleRange.end == null)
    ) {
      return null;
    }
    return visibleRange;
  };
  // Computes the range that will represent the element/cells for *rendering*,
  // but which may have voided days/times.
  // not responsible for trimming hidden days.
  buildRenderRange = (currentRange, currentRangeUnit, isRangeAllDay) => {
    return currentRange;
  };
  // Compute the duration value that should be added/substracted to the current date
  // when a prev/next operation happens.
  buildDateIncrement = fallback => {
    var dateIncrementInput = this.options.dateIncrement;
    var customAlignment;
    if (dateIncrementInput) {
      return createDuration(dateIncrementInput);
    } else if ((customAlignment = this.options.dateAlignment)) {
      return createDuration(1, customAlignment);
    } else if (fallback) {
      return fallback;
    } else {
      return createDuration({ days: 1 });
    }
  };
  // Arguments after name will be forwarded to a hypothetical function value
  // WARNING: passed-in arguments will be given to generator functions as-is and can cause side-effects.
  // Always clone your objects if you fear mutation.
  getRangeOption() {
    var otherArgs = [];
    for (var _i = 1; _i < arguments.length; _i++) {
      otherArgs[_i - 1] = arguments[_i];
    }
    var val = this.options[name];
    if (typeof val === "function") {
      val = val.apply(null, otherArgs);
    }
    if (val) {
      val = parseRange(val, this.dateEnv);
    }
    if (val) {
      val = computeVisibleDayRange(val);
    }
    return val;
  }

  /* Hidden Days
  ------------------------------------------------------------------------------------------------------------------*/
  // Initializes internal variables related to calculating hidden days-of-week
  initHiddenDays = () => {
    var hiddenDays = (this.options && this.options.hiddenDays) || []; // array of day-of-week indices that are hidden
    var isHiddenDayHash = []; // is the day-of-week hidden? (hash with day-of-week-index -> bool)
    var dayCnt = 0;
    var i;
    if (this.options && this.options.weekends === false) {
      hiddenDays.push(0, 6); // 0=sunday, 6=saturday
    }
    for (i = 0; i < 7; i++) {
      if (!(isHiddenDayHash[i] = hiddenDays.indexOf(i) !== -1)) {
        dayCnt++;
      }
    }
    if (!dayCnt) {
      throw new Error("invalid hiddenDays"); // all days were hidden? bad.
    }
    this.isHiddenDayHash = isHiddenDayHash;
  };

  // Remove days from the beginning and end of the range that are computed as hidden.
  // If the whole range is trimmed off, returns null
  trimHiddenDays = range => {
    var start = range.start;
    var end = range.end;
    if (start) {
      start = this.skipHiddenDays(start);
    }
    if (end) {
      end = this.skipHiddenDays(end, -1, true);
    }
    if (start == null || end == null || start < end) {
      return { start: start, end: end };
    }
    return null;
  };
  // Is the current day hidden?
  // `day` is a day-of-week index (0-6), or a Date (used for UTC)
  isHiddenDay = day => {
    if (day instanceof Date) {
      day = day.getUTCDay();
    }
    return this.isHiddenDayHash[day];
  };
  // Incrementing the current day until it is no longer a hidden day, returning a copy.
  // DOES NOT CONSIDER validRange!
  // If the initial value of `date` is not a hidden day, don't do anything.
  // Pass `isExclusive` as `true` if you are dealing with an end date.
  // `inc` defaults to `1` (increment one day forward each time)
  skipHiddenDays = (date, inc, isExclusive) => {
    if (inc === void 0) {
      inc = 1;
    }
    if (isExclusive === void 0) {
      isExclusive = false;
    }
    while (
      this.isHiddenDayHash[(date.getUTCDay() + (isExclusive ? inc : 0) + 7) % 7]
    ) {
      date = addDays(date, inc);
    }
    return date;
  };
  // return DateProfileGenerator;
}

const range = {
  start: new Date("2018-01-09T00:00:00.000Z"),
  end: new Date("2018-01-10T00:00:00.000Z")
};

let events = [
  {
    title: "All Day Event",
    start: "2018-01-01"
  },
  {
    title: "Long Event",
    start: "2018-01-07",
    end: "2018-01-10"
  },
  {
    id: 999,
    title: "Repeating Event",
    start: "2018-01-09T16:00:00"
  },
  {
    id: 999,
    title: "Repeating Event",
    start: "2018-01-16T16:00:00"
  },
  {
    title: "Conference",
    start: "2018-01-11",
    end: "2018-01-13"
  },
  {
    title: "Meeting",
    start: "2018-01-12T10:30:00",
    end: "2018-01-12T12:30:00"
  },
  {
    title: "Lunch",
    start: "2018-01-12T12:00:00"
  },
  {
    title: "Meeting",
    start: "2018-01-12T14:30:00"
  },
  {
    title: "Happy Hour",
    start: "2018-01-12T17:30:00"
  },
  {
    title: "Dinner",
    start: "2018-01-12T20:00:00"
  },
  {
    title: "Birthday Party",
    start: "2018-01-13T07:00:00"
  },
  {
    title: "Click for Google",
    url: "http://google.com/",
    start: "2018-01-28"
  }
];
var dateGenerator = new DateProfileGenerator();
const k = {
  start: new Date("2017-12-31T00:00:00.000Z"),
  end: new Date("2018-02-11T00:00:00.000Z")
};
DaySeries(k, dateGenerator);
// console.log(DaySeries(range, dateGenerator));
let consoledated = [];
events.map(event => {
  //   console.log(event);
  let updated = {};
  if (event.start) {
    updated["start"] = new Date(event.start);
  }
  if (event.end) {
    updated["end"] = new Date(event.end);
  }
  //   if (event.end == undefined) {
  //     updated["end"] = new Date(event.start);
  //   }
  console.log({ ...event, ...updated });

  let ran = { ...event, ...updated };
  const k = {
    start: new Date("2017-12-31T00:00:00.000Z"),
    end: new Date("2018-02-11T00:00:00.000Z")
  };
  consoledated.push({ ...sliceRange(ran) });
});

console.log({ consoledated });

// console.log(DaySeries(range, dateGenerator));

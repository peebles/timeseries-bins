const chai = require('chai');
const expect = chai.expect;
const dumpf = (o) => {
  console.log(JSON.stringify(o, null, 2));
}

const dayjs = require('../dayjs-timezone');
const timeseries = require( '../index' );

const _meanBy = require('lodash.meanby');

const dateStrings = [
  '2017-02-02T10:00:00',
  '2017-02-02T11:15:00',
  '2017-02-10T09:00:00',
  '2017-02-11T17:15:00',
  '2017-02-13T11:30:00',
  '2017-02-13T16:45:00',
  '2017-03-02T09:00:00',
  '2017-03-04T11:15:00',
  '2017-03-04T22:10:00',
  '2017-03-07T03:16:27',
  '2017-03-07T03:17:03',
  '2017-03-07T03:17:19',
];

const TZ = "America/Los_Angeles";

const cvt = (points) => {
  return points.map(p => {
    return {
      ...p,
      timestamp: dayjs(p.timestamp).format()
    }
  });
}

const createReference = (data, tc) => {
  require('fs').writeFileSync(`test/reference/${tc}.json`, JSON.stringify(data, null, 2));
}

describe("tests", function() {
  it("can do a simple test", async() => {
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d).tz(TZ).valueOf(),
        value: 10
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
      fill: 0,
    });
    //dumpf(cvt(bins));
    let ref = require("./reference/weeks-fill0.json");
    expect(cvt(bins)).to.eql(ref);
  });

  it("can do a simple test, with dayjs timestamps", async() => {
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d, TZ),
        value: 10
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
      fill: 0,
    });
    //dumpf(cvt(bins));
    let ref = require("./reference/weeks-fill0.json");
    expect(cvt(bins)).to.eql(ref);
  });

  it("can do a simple test, with date timestamps", async() => {
    let points = dateStrings.map(d => {
      return {
        timestamp: new Date(d),
        value: 10
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
      fill: 0,
    });
    //dumpf(cvt(bins));
    let ref = require("./reference/weeks-fill0.json");
    expect(cvt(bins)).to.eql(ref);
  });

  it("can do rollup", async() => {
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d).tz(TZ).valueOf(),
        value: 10
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
    });
    //dumpf(cvt(bins));
    let ref = require("./reference/rollup.json");
    expect(cvt(bins)).to.eql(ref);
  });

  it("can do all intervals", async() => {
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d).tz(TZ).valueOf(),
        value: 10
      }
    });
    const intervals = ['day', 'week', 'month', 'quarter', 'year', '15mins', '60secs'];
    for(i=0; i<intervals.length; i++) {
      let interval = intervals[i];
      //console.log(interval);
      let bins = await timeseries({
        data: points,
        fcn: 'sum',
        start: dayjs("2017-02-01T00:00:00", TZ),
        end: dayjs("2017-04-01T00:00:00", TZ),
        interval,
        fill: 0
      });
      //dumpf(cvt(bins));
      let ref = require(`./reference/${interval}-fill0.json`);
      expect(cvt(bins)).to.eql(ref);
    }
  });

  it("can indicate generated points that were filled", async() => {
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d).tz(TZ).valueOf(),
        value: 10
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
      fill: 0,
      indicateGenerated: "generated",
    });
    //dumpf(cvt(bins));
    let ref = require("./reference/weeks-fill0-generated.json");
    expect(cvt(bins)).to.eql(ref);
  });

  // multiple values, including non-numbers
  it("can do multiple values and mixed media", async() => {
    let v1i = 1;
    let v2i = 20;
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d).tz(TZ).valueOf(),
        v1: v1i++,
        v2: v2i++,
        s: "a string",
        o: {"an": "object"}
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
    });
    //dumpf(cvt(bins));
    //createReference(cvt(bins), 'mixed-media');
    let ref = require("./reference/mixed-media.json");
    expect(cvt(bins)).to.eql(ref);
  });

  // other fcns
  it("can do mean", async() => {
    let v1i = 1;
    let v2i = 20;
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d).tz(TZ).valueOf(),
        v1: v1i++,
        v2: v2i++,
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'mean',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
    });
    dumpf(cvt(bins));

    expect(bins[0].v1).to.equal(_meanBy(points, 'v1'));
    expect(bins[0].v2).to.equal(_meanBy(points, 'v2'));

    //createReference(cvt(bins), 'mean');
    let ref = require("./reference/mean.json");
    expect(cvt(bins)).to.eql(ref);
  });

  // field extraction, with and without fill
  it("can do field extraction", async() => {
    let v1i = 1;
    let v2i = 20;
    let points = dateStrings.map(d => {
      return {
        timestamp: dayjs(d).tz(TZ).valueOf(),
        v1: v1i++,
        v2: v2i++,
        s: "a string",
        o: {"an": "object"}
      }
    });
    let bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
      fields: ['v1'],
    });
    //dumpf(cvt(bins));
    //createReference(cvt(bins), 'field-extraction');
    let ref = require("./reference/field-extraction.json");
    expect(cvt(bins)).to.eql(ref);

    bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
      fields: ['v1'],
      fill: 0
    });
    //dumpf(cvt(bins));
    //createReference(cvt(bins), 'field-extraction-fill');
    ref = require("./reference/field-extraction-fill.json");
    expect(cvt(bins)).to.eql(ref);

    bins = await timeseries({
      data: points,
      fcn: 'sum',
      start: dayjs("2017-02-01T00:00:00", TZ),
      end: dayjs("2017-04-01T00:00:00", TZ),
      interval: "week",
      fields: ['v1'],
      fill: "previous"
    });
    //dumpf(cvt(bins));
    //createReference(cvt(bins), 'field-extraction-fill-previous');
    ref = require("./reference/field-extraction-fill-previous.json");
    expect(cvt(bins)).to.eql(ref);
  });

  // fcn is an object {field: fcn} with sum/mean



});

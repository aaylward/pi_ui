(function() {

  const ONE_HOUR_MILLIS = 60 * 60 * 1000;
  const ONE_DAY_MILLIS = ONE_HOUR_MILLIS * 24;
  const MINIMUM_ACCEPTABLE_SIZE = 100;

  function prefetch() {
    let canvas = document.getElementById('data');
    let ctx = canvas.getContext('2d');
    ctx.font = '48px Helvetica';
    ctx.clearRect(0, 0, canvas.width, canvas.height);   
    ctx.fillText('Fetching Data...', 10, 50);
  }

  function fetchObjects(deviceId, from, to) {
    prefetch();
    const requestConfig = {
      method: 'GET',
      mode: 'cors',
      cache: 'default'
    };

    const request = new Request(`https://api.tippypi.com/v1/sensors?deviceId=${deviceId}&from=${from}&to=${to}`, requestConfig);

    return fetch(request).then(function(response) {
      const contentType = response.headers.get('content-type');
      if(contentType && contentType.indexOf('json') !== -1) {
        return response.json();
      } else {
        throw new Error('failed to retrieve data');
      }
    });
  }

  function minMaxIteration(currentMin, currentMax, newValue) {
    if (newValue < currentMin) {
      currentMin = newValue;
    }
    if (newValue > currentMax) {
      currentMax = newValue;
    }
    return [currentMin, currentMax];
  }

  function renderData(sortedData) {
    const canvas = document.getElementById('data');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);   

    if (sortedData.length < 2) {
      return;
    }

    const length = sortedData.length;
    const startTime = sortedData[0].time;
    const endTime = sortedData[sortedData.length - 2].time;

    let scaleTime = (time) => (time - startTime) * (length / (endTime - startTime))

    if (sortedData.length < MINIMUM_ACCEPTABLE_SIZE) {
      ctx.fillText('Hmmm, no data available for selected time range. Maybe check the pi?' , 10, 50);
      return;
    }

    let minTemp = 9999999999;
    let maxTemp = -9999999999;

    let averageTemperature = 0;
    for (let p of sortedData) {
      [minTemp, maxTemp] = minMaxIteration(minTemp, maxTemp, p.temperature);
      averageTemperature += p.temperature;
    }

    averageTemperature /= sortedData.length;
    averageTemperature -= 7;
    const averageFahrenheit = averageTemperature * 9/5 + 32;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const stepSize = Math.max(~~(length / width), 1);

    const tempScaleFactor = height / (maxTemp - minTemp);
    let scaleTemp = (temperature) => (temperature - minTemp) * tempScaleFactor;

    ctx.font = '18px helvetica';
    ctx.fillText(`average temperature over the last hour: ${averageFahrenheit} F`, 10, 50);

    let graphProp = (props, fn, color) => {
      ctx.moveTo(0, height);
      for (let i=0; i<props.length; i+= stepSize) {
        ctx.lineTo(scaleTime(props[i].time), fn(props[i]));
      }
      ctx.strokeStyle = color;
      ctx.stroke();
    }

    graphProp(sortedData, (p) => scaleTemp(p.temperature), "Red")
  }

  function app() {
    const body = document.getElementById('body');
    const canvas = document.createElement('canvas');

    canvas.setAttribute('id', 'data');
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 20;

    const ctx = canvas.getContext('2d');
    ctx.setFill

    body.appendChild(canvas);

    const to = +new Date;
    const from = to - ONE_HOUR_MILLIS;
    const deviceId = 2;

    fetchObjects(deviceId, from, to).then(renderData);
  }

  app();

})()

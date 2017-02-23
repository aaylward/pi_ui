(function() {

  const ONE_HOUR_MILLIS = 60 * 60 * 1000;

  function prefetch() {
    let canvas = document.getElementById('data');
    let ctx = canvas.getContext('2d');
    ctx.font = '48px serif';
    ctx.clearRect(0, 0, canvas.width, canvas.height);   
    ctx.fillText('Fetching Data...', 10, 50);
  }

  function fetchObjects(from, to) {
    prefetch();
    const requestConfig = {
      method: 'GET',
      mode: 'cors',
      cache: 'default'
    };

    const request = new Request(`https://api.tippypi.com/v1/sensors?from=${from}&to=${to}`, requestConfig);

    return fetch(request).then(function(response) {
      const contentType = response.headers.get('content-type');
      if(contentType && contentType.indexOf('json') !== -1) {
        return response.json();
      } else {
        throw new Error('failed to retrieve data');
      }
    });
  }

  function renderData(sortedData) {
    let minTemp = 9999999999;
    let maxTemp = -9999999999;
    let minLight = 9999999999;
    let maxLight = -9999999999;
    for (let p of sortedData) {
      if (p.temperature < minTemp) {
        minTemp = p.temperature;
      }
      if (p.temperature > maxTemp) {
        maxTemp = p.temperature;
      }
      if (p.light < minLight) {
        minLight = p.light;
      }
      if (p.light > maxLight) {
        maxLight = p.light;
      }
    }
    let canvas = document.getElementById('data');
    let ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);   

    const width = window.innerWidth;
    const height = window.innerHeight;
    const length = sortedData.length;
    const skipSize = Math.max(~~(length / width), 1);

    const tempScaleFactor = height / (maxTemp - minTemp);
    let scaleTemp = (temperature) => (temperature - minTemp) * tempScaleFactor;

    const lightScaleFactor = height / (maxLight - minLight);
    let scaleLight = (light) => (light - minLight) * lightScaleFactor;

    let graphProp = (props, fn) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      let minValue = 9999999;
      let xVal = 0;
      for (let i=0; i<props.length; i+= skipSize) {
        let val = fn(props[i]);
        if (val < minValue) {
          minValue = val;
          xVal = i;
        }
        ctx.lineTo(i, val);
      }

      ctx.strokeStyle = "Red";
      ctx.stroke();
      console.log('min prop { ' + xVal + ', ' + (height - minValue) + ' }')
    }

    graphProp(sortedData, (p) => scaleTemp(p.temperature))
  }

  function app() {
    const body = document.getElementById('body');
    const canvas = document.createElement('canvas');

    canvas.setAttribute('id', 'data');
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 20;

    body.appendChild(canvas);

    const to = +new Date;
    const from = to - ONE_HOUR_MILLIS;

    fetchObjects(from, to).then(renderData);
  }

  app();

})()

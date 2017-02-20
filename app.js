(function() {

  const ONE_DAY_MILLIS = 24 * 60 * 60 * 1000;

  function toXML(text) {
    return new DOMParser().parseFromString(text, "text/xml");
  }

  function toText(response) {
    if (response.ok) {
      return response.text();
    }
    throw new Error('list fetch failed');
  }

  function tryJson(text) {
    if (!text) {
      return;
    }
    try {
      let j = JSON.parse(text);
      if (j.time) {
        return j;
      }
    } catch (error) {
      //ignore
    }
  }

  function getKeys(xmlDoc) {
    let result = [];
    for (let node of xmlDoc.children[0].children) {
      if (node.localName === 'Contents') {
        for (let child of node.children) {
          if (child.localName === 'Key') {
            result.push(child.innerHTML);
            break;
          }
        }
      }
    }
    return result;
  }

  function parseSensorData(textData) {
    let lines = textData.split('\n');
    let result = [];

    for (let line of lines) {
      let maybeJson = tryJson(line);
      if (maybeJson) {
        result.push(maybeJson);
      }
    }
    return result;
  }

  function getPrefix(millisAgo) {
    const yesterday = new Date((+new Date) - millisAgo);
    const monthNumber = yesterday.getMonth() + 1;
    const month = monthNumber < 10 ? '0' + monthNumber : '' + monthNumber;
    return `environment${yesterday.getFullYear()}/${month}/${yesterday.getDate()}`;
  }

  function getNext(xmlDoc) {
    for (let child of xmlDoc.children[0].children) {
      if (child.localName === 'NextContinuationToken') {
        return child.innerHTML;
      }
    }
    return false;
  }

  function listCall(url, search, token, acc) {
    let continuation = token ? 'list-type=2&continuation-token=' + encodeURIComponent(token) + '&' : '';
    return fetch(url + '?' + continuation + search)
      .then(toText)
      .then(toXML)
      .then((xml) => {
        let ret = acc.concat(getKeys(xml));
        let nextToken = getNext(xml);
        if (!nextToken) {
          return ret;
        }
        return listCall(url, '', nextToken, ret);
      })
  }
  
  function listAllKeys(url, timePeriod) {
    let search = 'list-type=2&start-after=' + getPrefix(timePeriod) + '&max-keys=1000'
    return listCall(url, search, '', [])
  }

  function fetchObjects(baseUrl, keys) {
    let canvas = document.getElementById('data');
    let ctx = canvas.getContext('2d');
    ctx.font = '48px serif';
    ctx.clearRect(0, 0, canvas.width, canvas.height);   
    ctx.fillText('Fetching Data...', 10, 50);
    let filePromises = [];
    for (let key of keys) {
      filePromises.push(fetch(baseUrl + '/' + key)
        .then(toText)
        .then(parseSensorData)
      );
    }
    return Promise.all(filePromises);
  }

  function listObjs(baseUrl, timePeriod) {
    let canvas = document.getElementById('data');
    let ctx = canvas.getContext('2d');
    ctx.font = '48px serif';
    ctx.clearRect(0, 0, canvas.width, canvas.height);   
    ctx.fillText('Fetching Keys...', 10, 50);
    return listAllKeys(baseUrl, timePeriod);
  }

  function flatten(arrays) {
    let flat = (r, a) => Array.isArray(a) ? a.reduce(flat, r) : r.concat(a);
    return arrays.reduce(flat, []);
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
    const baseUrl = 'http://tippy-pi-sensors.s3.amazonaws.com';
    const body = document.getElementById('body');
    const canvas = document.createElement('canvas');

    canvas.setAttribute('id', 'data');
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 20;

    body.appendChild(canvas);

    listObjs(baseUrl, ONE_DAY_MILLIS).then(fetchObjects.bind(null, baseUrl)).then((values) => {
      let data = flatten(values);
      data.sort((a, b) => a.time - b.time);
      renderData(data);
    });
  }

  app();

})()

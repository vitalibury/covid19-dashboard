import moment from 'moment';

export default class ModelChart {
  constructor() {
    this.isForCountry = false;
    this.isPer100K = false;
    this.covidData = null;
    this.dataForChart = null;
    this.currentCountry = '';
    this.currentIndex = 0;
    this.chartIndices = ['cumulativeCases', 'cumulativeDeaths', 'cumulativeRecovered',
      'dailyCases', 'dailyDeaths', 'dailyRecovered'];

    this.queries = {
      baseUrl: 'https://disease.sh/v3/covid-19/historical/',
      daysParam: 'lastdays=all',
      allPopulation: 'https://disease.sh/v3/covid-19/all',
      countryPopulation: 'https://disease.sh/v3/covid-19/countries/',
    };

    this.chartColors = {
      cases: 'rgba(255, 0, 0, 0.8)',
      deaths: 'rgba(255, 255, 255, 0.8)',
      recovered: 'rgba(0, 255, 0, 0.8)',
    };
  }

  getNextIndex = () => {
    if (this.currentIndex === this.chartIndices.length - 1) {
      this.currentIndex = 0;
    } else {
      this.currentIndex += 1;
    }
    return this.chartIndices[this.currentIndex];
  };

  getPreviousIndex = () => {
    if (this.currentIndex === 0) {
      this.currentIndex = this.chartIndices.length - 1;
    } else {
      this.currentIndex -= 1;
    }
    return this.chartIndices[this.currentIndex];
  }

  updateData = async (country, isPer100K = false) => {
    if (country === 'all') {
      this.isForCountry = false;
    } else {
      this.isForCountry = true;
      this.currentCountry = country;
    }

    await fetch(this.getFullUrl(country))
      .then((response) => response.json())
      .then((data) => {
        this.covidData = this.isForCountry ? data.timeline : data;
      });

    if (isPer100K) {
      await this.updatePopulation(country);
    }

    this.prepareDataForChart(isPer100K);
  }

  updatePopulation = async (country) => {
    let query = '';
    this.isPer100K = true;
    if (this.isForCountry) {
      query = `${this.queries.countryPopulation}${country}`;
    } else {
      query = `${this.queries.allPopulation}`;
    }
    await fetch(query)
      .then((response) => response.json())
      .then((data) => {
        this.population = data.population;
      });
  }

  prepareDataForChart = (isPer100k = false) => {
    this.isPer100K = isPer100k;
    this.dataForChart = {
      cumulativeCases:
        this.prepareCumulativeData(this.covidData.cases, 'Cumulative Cases', this.chartColors.cases),
      cumulativeDeaths:
        this.prepareCumulativeData(this.covidData.deaths, 'Cumulative Deaths', this.chartColors.deaths),
      cumulativeRecovered:
        this.prepareCumulativeData(this.covidData.recovered, 'Cumulative Recovered', this.chartColors.recovered),
      dailyCases:
        this.prepareDailyData(this.covidData.cases, 'Daily Cases', this.chartColors.cases),
      dailyDeaths:
        this.prepareDailyData(this.covidData.deaths, 'Daily Deaths', this.chartColors.deaths),
      dailyRecovered:
        this.prepareDailyData(this.covidData.recovered, 'Daily Recovered', this.chartColors.recovered),
    };
  }

  prepareCumulativeData = (dataObj, label, color) => {
    let cumulativeData = {};
    const datasets = [];
    const dataset = {
      label,
      data: this.isPer100K
        ? Object.values(dataObj)
          .map((val) => this.roundNumber((val * 100000) / this.population, 3))
        : Object.values(dataObj),
      backgroundColor: color,
      borderColor: color,
      fill: false,
    };
    datasets[0] = dataset;

    cumulativeData = {
      type: 'line',
      data: {
        datasets,
        labels: Object.keys(dataObj)
          .map((val) => moment(`${val}`, 'MM-DD-YYYY').format('MMM DD YYYY')),
      },
    };

    return cumulativeData;
  }

  prepareDailyData = (dataObj, label, color) => {
    let dailyData = {};
    const datasets = [];
    const dataset = {
      label,
      fontColor: 'pink',
      data: this.isPer100K
        ? Object.values(dataObj)
          .map((val, ind, arr) => {
            const newValue = Math.abs(ind === 0 ? val : arr[ind] - arr[ind - 1]);
            return this.roundNumber((newValue * 100000) / this.population, 3);
          })
        : Object.values(dataObj)
          .map((val, ind, arr) => Math.abs(ind === 0 ? val : arr[ind] - arr[ind - 1]))
          .filter((val) => val < 1000000),
      backgroundColor: color,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.1)',
      barThicknes: 'flex',
      fill: false,
    };
    datasets[0] = dataset;

    dailyData = {
      type: 'bar',
      data: {
        datasets,
        labels: Object.keys(dataObj)
          .map((val) => moment(`${val}`, 'MM-DD-YYYY').format('MMM DD YYYY')),
      },
    };

    return dailyData;
  }

  roundNumber = (number, digits = 2) => {
    const divider = 10 ** digits;
    return Math.round(number * divider) / divider;
  }

  getFullUrl = (country) => `${this.queries.baseUrl}${country}?${this.queries.daysParam}`;

  getData = () => this.covidData;

  getDataForChart = (index) => {
    this.currentIndex = this.chartIndices.indexOf(index);
    return JSON.stringify(this.dataForChart[index]);
  }
}

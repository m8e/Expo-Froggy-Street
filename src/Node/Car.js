import Expo from 'expo'
import React, {Component} from 'react';
import Generic from './Generic';

const cars = [
  'police_car',
  'blue_car',
  'blue_truck',
  'green_car',
  'orange_car',
  'purple_car',
  'red_truck',
  'taxi',
];

export default class Car extends Generic {

  setup = async () => {
    const {vehicles } = this.globalModels;

    for (let index in cars) {
      let car = cars[index];
      this.models[`${index}`] = await this._download(vehicles[car]);
    }

    return this.models;
  }
}

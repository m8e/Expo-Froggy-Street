import React, { Component } from 'react';
import { Text, View,Animated, StyleSheet } from 'react-native';
import { Constants } from 'expo';

import Button from '../Button';
import Images from '../../Images';
import Carousel from './Carousel';

import Expo from 'expo'
import {TweenMax, Power2, TimelineLite} from "gsap";
import * as THREE from 'three'
// import createTHREEViewClass from '../createTHREEViewClass';
const THREEView = Expo.createTHREEViewClass(THREE);
const size = 150;
import Characters from '../../Characters';
import {modelLoader} from '../../main';
import Node from '../Node';
const {
  Hero,
  Car,
  Log,
  Road,
  Grass,
  River,
  Tree,
  Train,
  RailRoad
} = Node;

export default class CharacterCard extends Component {
  scale = 0.5;
  state = {
    setup: false
  }

  componentWillMount() {
    this.scene = new THREE.Scene();

    this.lights();
    this.camera();
    this.character();

    this.setState({setup: true})
  }

  lights = () => {
    this.scene.add(new THREE.AmbientLight(0xffffff, .9));
    let shadowLight = new THREE.DirectionalLight(0xffffff, 1);
    shadowLight.position.set( 1, 1, 0 ); 			//default; light shining from top
    this.scene.add(shadowLight);
  }
  camera = () => {
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10);
    this.camera.position.z = 1;
    this.camera.position.y = 0.4;
    // this.camera.lookAt(0,0,0);
  }

  character = () => {
    this.character = modelLoader._hero.getNode(this.props.id);
    this.character.scale.set(this.scale,this.scale,this.scale)
    this.scene.add(this.character);
  }

  tick = dt => {
    if (!this.state.setup) { return; }
    this.character.rotation.y += 1 * dt
  };

  render() {
    if (this.state.setup) {
      return (
        <View pointerEvents={'none'}  style={StyleSheet.flatten([styles.container, this.props.style])}>
          <View style={{flex: 1}}>
            {Expo.Constants.isDevice &&
              <THREEView
                backgroundColorAlpha={0}
                style={{flex: 1}}
                scene={this.scene}
                camera={this.camera}
                tick={this.tick} />
            }
          </View>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    width:size,
    height: size * 2,
    justifyContent: 'center',
  },
});

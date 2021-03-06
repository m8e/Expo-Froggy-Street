import Expo, {AppLoading} from 'expo';
import React, {Component} from 'react';
import {
  TouchableWithoutFeedback,
  Vibration,
  Animated,
  Dimensions,
  Text,
  InteractionManager,
  View,
} from 'react-native';

import GestureRecognizer, {swipeDirections} from '../GestureView';
import Water from '../Particles/Water';
import Feathers from '../Particles/Feathers';

import {TweenMax} from "gsap";
import State from '../../state';
import * as THREE from 'three';
import createTHREEViewClass from '../../utils/createTHREEViewClass';
import { NavigationActions } from 'react-navigation';

const THREEView = createTHREEViewClass(THREE);
const {width, height} = Dimensions.get('window');

import connectGameState from '../../utils/connectGameState';
import connectCharacter from '../../utils/connectCharacter';
import {modelLoader} from '../../main';
export const groundLevel = 0.4;
const sceneColor = 0x6dceea;
const startingRow = 8;

import Rows from '../Row';
import {Fill} from '../Row/Grass'
const AnimatedGestureRecognizer = Animated.createAnimatedComponent(GestureRecognizer);

@connectGameState
@connectCharacter
class Game extends Component {
  /// Reserve State for UI related updates...
  state = { ready: false, score: 0,};

  maxRows = 20;
  sineCount = 0;
  sineInc = Math.PI / 50;


  componentWillReceiveProps(nextProps) {

    if (nextProps.gameState !== this.props.gameState) {
      this.updateWithGameState(nextProps.gameState, this.props.gameState);
    }
    if (nextProps.character.id !== this.props.character.id) {
      (async () => {

        this.scene.remove(this._hero);
        this._hero = this.hero.getNode(nextProps.character.id);
        this.scene.add(this._hero);
        this._hero.position.set(0, groundLevel, startingRow);
        this._hero.scale.set(1,1,1);
        this.init();

      })()
    }
  }
  updateWithGameState = (gameState, previousGameState) => {
    if (gameState == this.gameState) {
      return;
    }
    this.gameState = gameState;
    const {playing, gameOver, paused, none} = State.Game;
    switch (gameState) {
      case playing:
      this.stopIdle();
      TweenMax.to(this.title.position, 1, {
        x: -10,
      })

      this.onSwipe(swipeDirections.SWIPE_UP, {});

      break;
      case gameOver:

      break;
      case paused:

      break;
      case none:
      this.newScore();

      break;
      default:
      break;
    }
  }

  componentWillMount() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-width, width, height, -height, -30, 30);
    this.camera.position.set(-1, 2.8, -2.9); // Change -1 to -.02
    this.camera.zoom = 110; // for birds eye view
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.scene.position);

    this.doGame();
    // this.props.setGameState(State.Game.none)
  }

  createParticles = () => {


    this.waterParticles = new Water(THREE);
    this.scene.add(this.waterParticles.mesh);

    this.featherParticles = new Feathers(THREE);
    this.scene.add(this.featherParticles.mesh);

  }

  useParticle = (model, type, direction) => {
    requestAnimationFrame(_=> {


    if (type === 'water') {
      this.waterParticles.mesh.position.copy(model.position);
      this.waterParticles.mesh.visible = true;
      this.waterParticles.run(type);
    } else if (type == 'feathers') {
      this.featherParticles.mesh.position.copy(model.position);
      // this.featherParticles.mesh.visible = true;
      this.featherParticles.run(type, direction);
    }
    })
  }

  createLights = () => {

    let shadowLight = new THREE.DirectionalLight(0xffffff, 0.3);
    shadowLight.position.set( 1, 1, 0 ); 			//default; light shining from top
    shadowLight.lookAt( 0, 0, 0 ); 			//default; light shining from top

    this.scene.add(new THREE.AmbientLight(0xe9ffdc, .8));
    this.scene.add(shadowLight);
  }

  newScore = () => {
    Vibration.cancel();


    // this.props.setGameState(State.Game.playing);
    this.setState({score: 0})
    this.init();
  }

  doneMoving = () => {
    this._hero.moving = false;
    this.updateScore();

    this.lastHeroZ = this._hero.position.z;
    this._hero.lastPosition = this._hero.position;


    // this._hero.position.set(Math.round(this._hero.position.x), this._hero.position.y, Math.round(this._hero.position.z))
  }

  getWidth = (mesh) => {
    let box3 = new THREE.Box3();
    box3.setFromObject(mesh);
    return Math.round(box3.max.x - box3.min.x);
  }
  getDepth = mesh => {
    let box3 = new THREE.Box3();
    box3.setFromObject(mesh);

    return Math.round(box3.max.z - box3.min.z);
  }

  loadModels = () => {
    const { _hero} = modelLoader;

    this.hero = _hero;
  }



  doGame = async () => {

    this.timing = 0.10;

    // Variables
    this.grass = [],
    this.grassCount = 0; //
    this.water = [],
    this.waterCount = 0; // Terrain tiles
    this.road = [],
    this.roadCount = 0; //
    this.railRoads = [],
    this.railRoadCount = 0; //

    this.lastHeroZ = 8;

    this.rowCount = 0;
    this.camCount = 0,
    this.camSpeed = .02;
    this.heroWidth = .7;

    this.loadModels()
    this.createParticles();
    this.createLights();

    this.title = modelLoader._title.getNode();
    let scale = 0.08;
    this.title.scale.set(scale,scale,scale);
    this.title.rotation.y = Math.PI;
    this.title.position.set(10, 3, 9);
    this.scene.add(this.title);

    // Mesh
    // console.warn(this.props.character.id)
    this._hero = this.hero.getNode(this.props.character.id);

    //Custom Params
    this._hero.moving = false;
    this._hero.hitBy = null;
    this._hero.ridingOn = null;
    this._hero.ridingOnOffset = null;
    this.scene.add(this._hero);


    // Assign mesh to corresponding array
    // and add mesh to scene
    for (i = 0; i < this.maxRows; i++) {

      this.grass[i] = new Rows.Grass(this.heroWidth); // this._railroad.getRandom();
      this.water[i] = new Rows.Water(this.heroWidth, this.onCollide); // this._railroad.getRandom();
      this.road[i] = new Rows.Road(this.heroWidth, this.onCollide); // this._railroad.getRandom();
      this.railRoads[i] = new Rows.RailRoad(this.heroWidth, this.onCollide); // this._railroad.getRandom();
      this.scene.add(this.grass[i]);
      this.scene.add(this.water[i]);
      this.scene.add(this.road[i]);
      this.scene.add(this.railRoads[i]);

    }


    // // Repeat above for terrain objects
    // for (i = 0; i < 20; i++) {
    //   const mesh = this._lilyPad.getRandom();
    //
    //   TweenMax.to(mesh.rotation, (Math.random() * 2) + 2, {
    //     y: (Math.random() * 1.5) + 0.5,
    //     yoyo: true,
    //     repeat: -1,
    //     ease: Power1.easeInOut
    //   });
    //
    //   const width = this.getWidth(mesh);
    //   this.lilys[i] = {mesh, width, collisionBox: (this.heroWidth / 2 + width / 2 - .1) };
    //   this.scene.add(mesh);
    //
    //
    // }


    this.init();
  }

  onCollide = (obstacle, type = 'feathers') => {
    if (this.gameState != State.Game.playing) {
      return;
    }
    this._hero.isAlive = false;
    this.useParticle(this._hero, type, (obstacle || {}).speed || 0);
    this.rumbleScreen()
    this.gameOver();
  }

  stopIdle = () => {
    if (this.idleAnimation) {
      this.idleAnimation.pause();
      this.idleAnimation = null;
      this._hero.scale.set(1,1,1);
    }
  }

  idle = () => {
    this.stopIdle();

    const s = 0.8;
    this.idleAnimation = new TimelineMax({repeat: -1});
    this.idleAnimation
    .to(this._hero.scale, 0.3, {x:1,y:s,z:0.9, ease:Power1.easeIn})
    .to(this._hero.scale, 0.6, {x:1,y:1,z:1, ease:Power1.easeOut})
  }

  // Setup initial scene
  init = () => {
    const offset = -30;
    this.setState({score: 0})
    this.camera.position.z = startingRow + 1;
    this._hero.position.set(0, groundLevel, startingRow);
    this._hero.scale.set(1,1,1);
    this._hero.rotation.set(0, Math.PI, 0);
    this.map = {};
    this.camCount = 0;
    this.map[`${0},${groundLevel|0},${startingRow|0}`] = 'player'
    this.initialPosition = null;
    this.targetPosition = null;
    this.grassCount = 0;
    this.waterCount = 0;
    this.roadCount = 0;
    this.railRoadCount = 0;

    this.rowCount = 0;
    this._hero.hitBy = null;
    this._hero.ridingOn = null;
    this._hero.ridingOnOffset = null;
    this.lastHeroZ = startingRow;
    this.floorMap = {};
    this._hero.isAlive = true;

    this.idle();

    this.title.position.x = 10


    for (i = 0; i < this.maxRows; i++) {
      this.grass[i].position.z = offset;

      this.water[i].position.z = offset;
      this.water[i].active = false;
      this.road[i].position.z = offset;
      this.road[i].active = false;
      this.railRoads[i].position.z = offset;
      this.railRoads[i].active = false;

    }

    this.grass[this.grassCount].position.z = this.rowCount;
    this.grass[this.grassCount].generate(this.mapRowToObstacle(this.rowCount))
    this.grassCount++;
    this.rowCount++;

    for (i = 0; i < 23; i++) {
      this.newRow();
    }

    this.setState({ ready: true });

    TweenMax.to(this.title.position, 1, {
      x: 0,
      delay: 0.2,
    })
  }

  mapRowToObstacle = (row) => {
    if (this.rowCount < 5) {
      return Fill.solid;
    } else if (this.rowCount < 10) {
      return Fill.empty;
    } else {
      return Fill.random;
    }
  }

  floorMap = {};
  // Scene generators
  newRow = rowKind => {
    if (this.grassCount == this.maxRows) {
      this.grassCount = 0;
    }
    if (this.roadCount == this.maxRows) {
      this.roadCount = 0;
    }
    if (this.waterCount == this.maxRows) {
      this.waterCount = 0;
    }
    if (this.railRoadCount == this.maxRows) {
      this.railRoadCount = 0;
    }
    if (this.rowCount < 10) {
      rowKind = 1;
    }

    let rk = rowKind || Math.floor(Math.random() * 3) + 1;
    switch (rk) {
      case 1:
      this.grass[this.grassCount].position.z = this.rowCount;
      this.grass[this.grassCount].generate(this.mapRowToObstacle(this.rowCount))
      this.floorMap[`${this.rowCount}`] = {type: 'grass', entity: this.grass[this.grassCount]};
      this.grassCount++;
      this.lastRk = rk;
      break;
      case 2:
      {
        if (((Math.random() * 5)|0) == 0) {
          this.railRoads[this.railRoadCount].position.z = this.rowCount;
          this.railRoads[this.railRoadCount].active = true;
          this.floorMap[`${this.rowCount}`] = {type: 'railRoad', entity: this.railRoads[this.railRoadCount]};
          this.railRoadCount++;
          this.lastRk = rk + 1000;
        } else {
          this.road[this.roadCount].position.z = this.rowCount;
          this.road[this.roadCount].active = true;
          this.floorMap[`${this.rowCount}`] = {type: 'road', entity: this.road[this.roadCount]};
          this.roadCount++;
          this.lastRk = rk;
        }
      }
      break;

      case 3:
      this.water[this.waterCount].position.z = this.rowCount;
      this.water[this.waterCount].active = true;
      this.water[this.waterCount].generate();
      this.floorMap[`${this.rowCount}`] = {type: 'water', entity: this.water[this.waterCount]};
      this.waterCount++;

      this.lastRk = rk;
      break;
    }

    this.rowCount++;
  }


  // Detect collisions with trees/cars
  treeCollision = (dir) => {
    var zPos = 0;
    var xPos = 0;
    if (dir == "up") {
      zPos = 1;
    } else if (dir == "down") {
      zPos = -1;
    } else if (dir == "left") {
      xPos = 1;
    } else if (dir == "right") {
      xPos = -1;
    }

    if (this.floorMap.hasOwnProperty(`${(this._hero.position.z + zPos)|0}`)) {

      const {type, entity} = this.floorMap[`${(this._hero.position.z + zPos)|0}`];
      if (type === "grass") {

        const key = `${(this._hero.position.x + xPos)|0}`;
        if (entity.obstacleMap.hasOwnProperty(key)) {
          return true;
        }
      }
    }

    return false;
  }

  moveUserOnEntity = () => {
    if (!this._hero.ridingOn) {
      return;
    }

    // let target = this._hero.ridingOn.mesh.position.x + this._hero.ridingOnOffset;
    this._hero.position.x += this._hero.ridingOn.speed;
    this.initialPosition.x = this._hero.position.x;
  }

  moveUserOnCar = () => {
    if (!this._hero.hitBy) {
      return;
    }

    let target = this._hero.hitBy.mesh.position.x;
    this._hero.position.x += this._hero.hitBy.speed;
    if (this.initialPosition)
    this.initialPosition.x = target;
  }

  rumbleScreen = () => {
    Vibration.vibrate();

    TweenMax.to(this.scene.position, 0.2, {
      x: 0,
      y: 0,
      z: 1,
    })
    TweenMax.to(this.scene.position, 0.2, {
      x: 0,
      y: 0,
      z: 0,
      delay: 0.2,
    })
  }

  // Move scene forward
  forwardScene = () => {
    const easing = 0.03;
    this.camera.position.z += (((this._hero.position.z + 1) - this.camera.position.z) * easing);
    this.camera.position.x =  Math.min(2, Math.max(-2, this.camera.position.x + (((this._hero.position.x) - this.camera.position.x) * easing)));

    // normal camera speed
    if (this.camera.position.z - this.camCount > 1.0) {
      this.camCount = this.camera.position.z;
      this.newRow();
    }
  }

  // Reset variables, restart game
  gameOver = () => {
    this._hero.moving = false;

    /// Stop player from finishing a movement
    this.heroAnimations.map(val => {val.pause(); val = null;} );
    this.heroAnimations = [];
    this.gameState = State.Game.gameOver;
    this.props.setGameState(this.gameState)

    InteractionManager.runAfterInteractions(_=> {
      this.props.navigation.dispatch(NavigationActions.navigate({ routeName: 'GameOver' }))
    });
    // this.props.nav.navigation.navigate('GameOver', {})
  }

  tick = dt => {
    // this.drive();

    for (let railRoad of this.railRoads) {
      railRoad.update(dt, this._hero)
    }
    for (let road of this.road) {
      road.update(dt, this._hero)
    }
    for (let water of this.water) {
      water.update(dt, this._hero)
    }

    if (!this._hero.moving) {
      this.moveUserOnEntity();
      this.moveUserOnCar();
    }
    this.forwardScene();
  }


///TODO: Fix
  checkIfUserHasFallenOutOfFrame = () => {
    if (this.gameState !== State.Game.playing) {
      return
    }
    if (this._hero.position.z < this.camera.position.z - 8) {
      ///TODO: rumble
      this.rumbleScreen()
      this.gameOver();
    }
    /// Check if offscreen
    if (this._hero.position.x < -5 || this._hero.position.x > 5) {
      ///TODO: Rumble death
      this.rumbleScreen()
      this.gameOver();
    }
  }

  updateScore = () => {
    const position = Math.max(Math.floor(this._hero.position.z) - 8, 0);
    if (this.state.score < position) {
      this.setState({score: position})
    }
  }

  moveWithDirection = direction => {
    if (this.gameState != State.Game.playing ) {
      return;
    }

    const {SWIPE_UP, SWIPE_DOWN, SWIPE_LEFT, SWIPE_RIGHT} = swipeDirections;

    this._hero.ridingOn = null;

    if (!this.initialPosition) {
      this.initialPosition = this._hero.position;
      this.targetPosition = this.initialPosition;
    }

    if (this._hero.moving) {
      this._hero.position = this.targetPosition;
      // return
    };

    switch (direction) {
      case SWIPE_LEFT:
      this._hero.rotation.y = Math.PI/2
      if (!this.treeCollision("left")) {
        this.targetPosition = {x: this.initialPosition.x + 1, y: this.initialPosition.y, z: this.initialPosition.z};
        this._hero.moving = true;
      }
      break;
      case SWIPE_RIGHT:
      this._hero.rotation.y = -Math.PI/2
      if (!this.treeCollision("right")) {
        this.targetPosition = {x: this.initialPosition.x - 1, y: this.initialPosition.y, z: this.initialPosition.z};
        this._hero.moving = true;

      }
      break;
      case SWIPE_UP:
      this._hero.rotation.y = 0;
      if (!this.treeCollision("up")) {
        const row = (this.floorMap[`${this.initialPosition.z + 1}`] || {}).type
        let shouldRound = row != "water"
        this.targetPosition = {x: this.initialPosition.x, y: this.initialPosition.y, z: this.initialPosition.z + 1};
        if (shouldRound) {
          this.targetPosition.x = Math.round(this.targetPosition.x);
          const {ridingOn} = this._hero
          if (ridingOn && ridingOn.dir) {
              if (ridingOn.dir < 0) {
                this.targetPosition.x = Math.floor(this.targetPosition.x);
              } else if (ridingOn.dir > 0) {
                this.targetPosition.x = Math.ceil(this.targetPosition.x);
              } else {
                this.targetPosition.x = Math.round(this.targetPosition.x);
              }
          }
        }

        this._hero.moving = true;

      }
      break;
      case SWIPE_DOWN:
      this._hero.rotation.y = Math.PI
      if (!this.treeCollision("down")) {
        const row = (this.floorMap[`${this.initialPosition.z - 1}`] || {}).type
        let shouldRound = row != "water"
        this.targetPosition = {x: this.initialPosition.x, y: this.initialPosition.y, z: this.initialPosition.z - 1};
        if (shouldRound) {
          this.targetPosition.x = Math.round(this.targetPosition.x);
          const {ridingOn} = this._hero
          if (ridingOn && ridingOn.dir) {
              if (ridingOn.dir < 0) {
                this.targetPosition.x = Math.floor(this.targetPosition.x);
              } else if (ridingOn.dir > 0) {
                this.targetPosition.x = Math.ceil(this.targetPosition.x);
              } else {
                this.targetPosition.x = Math.round(this.targetPosition.x);
              }
          }

        }
        this._hero.moving = true;
      }
      break;
    }
    let {targetPosition, initialPosition} = this;

    let delta = {x: (targetPosition.x - initialPosition.x), y: targetPosition.y - initialPosition.y, z: targetPosition.z - initialPosition.z}

    let timing = 0.5;

    this.heroAnimations = [];

    this.heroAnimations.push(TweenMax.to(this._hero.position, this.timing, {
      x: this.initialPosition.x + (delta.x * 0.75),
      y: groundLevel + 0.5,
      z: this.initialPosition.z + (delta.z * 0.75),
    }));

    this.heroAnimations.push(TweenMax.to(this._hero.scale, this.timing, {
      x: 1,
      y: 1.2,
      z: 1,
    }));
    this.heroAnimations.push(TweenMax.to(this._hero.scale, this.timing, {
      x: 1.0,
      y: 0.8,
      z: 1,
      delay: this.timing
    }));
    this.heroAnimations.push(TweenMax.to(this._hero.scale, this.timing, {
      x: 1,
      y: 1,
      z: 1,
      ease: Bounce.easeOut,
      delay: this.timing * 2
    }));

    this.heroAnimations.push(TweenMax.to(this._hero.position, this.timing, {
      x: this.targetPosition.x,
      y: this.targetPosition.y,
      z: this.targetPosition.z,
      ease: Power4.easeOut,
      delay: 0.151,
      onComplete: this.doneMoving,
      onCompleteParams: []
    }));


    this.initialPosition = this.targetPosition;
  }

  beginMoveWithDirection = direction => {
    if (this.gameState != State.Game.playing) { return; }
    TweenMax.to(this._hero.scale, 0.2, {
      x: 1.2,
      y: 0.75,
      z: 1,
      // ease: Bounce.easeOut,
    });
  }


  onSwipe = (gestureName, gestureState) => this.moveWithDirection(gestureName);

  renderGame = () => {

    if (!this.state.ready) {
      return;
    }

    const config = {
      velocityThreshold: 0.3,
      directionalOffsetThreshold: 80
    };

    return (
      <AnimatedGestureRecognizer
        onResponderGrant={_=> {
          this.beginMoveWithDirection();
        }}
        onSwipe={(direction, state) => this.onSwipe(direction, state)}
        config={config}
        style={{
          flex: 1,
        }}
        >
          <TouchableWithoutFeedback
            onPressIn={_=> {
              this.beginMoveWithDirection();
            }}
            style={{flex: 1}}
            onPress={_=> {
              this.onSwipe(swipeDirections.SWIPE_UP, {});
            }}>
            {Expo.Constants.isDevice && <THREEView
              backgroundColor={sceneColor}
              shadowMapEnabled={true}
              shadowMapRenderSingleSided={true}
              style={{ flex: 1 }}
              scene={this.scene}
              camera={this.camera}
              tick={this.tick}
            />}
          </TouchableWithoutFeedback>
        </AnimatedGestureRecognizer>
      );
    }

    render() {

      return (
        <View style={[{flex: 1, backgroundColor: '#6dceea'}, this.props.style]}>
          {this.renderGame()}
          <Score score={this.state.score} gameOver={this.props.gameState === State.Game.gameOver}
          />
        </View>
      );
    }
  }

  import Score from './Score';
  import {connect} from 'react-redux';
  export default connect(
    state => ({
      nav: state.nav
    }),
    {
    }
  )(Game);

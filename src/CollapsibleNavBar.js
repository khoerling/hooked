import * as React from 'react';
import {
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  Text,
  Button,
  Platform,
  StatusBar,
} from 'react-native';
import Animated from 'react-native-reanimated';

const {
  event,
  Value,
  diffClamp,
  multiply,
  interpolate,
  cond,
  set,
  add,
  startClock,
  clockRunning,
  stopClock,
  Clock,
  sub,
  lessThan,
  spring,
  neq,
  eq,
} = Animated;

const DRAG_END_INITIAL = 10000000;
const STATUS_BAR_HEIGHT = Platform.select({ ios: 20, android: 24 });
const NAV_BAR_HEIGHT = Platform.select({ ios: 64, android: 56 });

function runSpring({
  clock,
  from,
  velocity,
  toValue,
  scrollEndDragVelocity,
  snapOffset,
  diffClampNode,
}) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };

  const config = {
    damping: 1,
    mass: 1,
    stiffness: 50,
    overshootClamping: true,
    restSpeedThreshold: 0.001,
    restDisplacementThreshold: 0.001,
    toValue: new Value(0),
  };

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, from),
      set(config.toValue, toValue),
      startClock(clock),
    ]),
    spring(clock, state, config),
    cond(state.finished, [
      set(scrollEndDragVelocity, DRAG_END_INITIAL),
      set(
        snapOffset,
        cond(
          eq(toValue, 0),
          // SnapOffset acts as an accumulator.
          // We need to keep track of the previous offsets applied.
          add(snapOffset, multiply(diffClampNode, -1)),
          add(snapOffset, sub(NAV_BAR_HEIGHT, diffClampNode)),
        ),
      ),
      stopClock(clock),
    ]),
    state.position,
  ];
}

class CollapsibleNavBar extends React.Component {
  constructor(props) {
    super(props);
    this.scrollY = new Value(0);
    this.scrollEndDragVelocity = new Value(DRAG_END_INITIAL);
    this.snapOffset = new Value(0);

    const diffClampNode = diffClamp(
      add(this.scrollY, this.snapOffset),
      0,
      NAV_BAR_HEIGHT,
    );
    const inverseDiffClampNode = multiply(diffClampNode, -1);

    const clock = new Clock();

    const snapPoint = cond(
      lessThan(diffClampNode, NAV_BAR_HEIGHT / 2),
      0,
      -NAV_BAR_HEIGHT,
    );

    this.animatedNavBarTranslateY = cond(
      // Condition to detect if we stopped scrolling
      neq(this.scrollEndDragVelocity, DRAG_END_INITIAL),
      runSpring({
        clock,
        from: inverseDiffClampNode,
        velocity: 0,
        toValue: snapPoint,
        scrollEndDragVelocity: this.scrollEndDragVelocity,
        snapOffset: this.snapOffset,
        diffClampNode,
      }),
      inverseDiffClampNode,
    );

    this.animatedTitleOpacity = interpolate(this.animatedNavBarTranslateY, {
      inputRange: [-NAV_BAR_HEIGHT, 0],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  }

  componentWillMount() {
    bus.addListener('closeDrawer', _ => {
      this.scrollView.getNode().scrollTo({y: 0, animated: false})
    })
  }

  componentWillUnmount() {
    bus.removeEventListener('closeDrawer')
  }

  onPress() {
    this.scrollView.getNode().scrollToEnd({animated: false})
    this.props.onPress()
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={_ => this.onPress()}>
        <View style={styles.contentContainerStyle}>
        <Animated.ScrollView
          ref={r => this.scrollView = r}
          keyboardShouldPersistTaps={'always'}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          scrollEventThrottle={16}
          onScroll={event(
            [
              {
                nativeEvent: {
                  contentOffset: {
                    y: this.scrollY,
                  },
                },
              },
            ],
            { useNativeDriver: true },
          )}
          onScrollEndDrag={event(
            [
              {
                nativeEvent: {
                  velocity: {
                    y: this.scrollEndDragVelocity,
                  },
                },
              },
            ],
            { useNativeDriver: true },
          )}
        >
          {this.props.data.map((item, index) => this.props.renderItem({item, index, onPress: _ => this.onPress()}))}
          <View onLayout={(e)=> {
              this.footerY = e.nativeEvent.layout.y;
            }}/>
        </Animated.ScrollView>
        <Animated.View
          style={[
            styles.navBar,
            {
              transform: [
                {
                  translateY: this.animatedNavBarTranslateY,
                },
              ],
            },
          ]}
        >
          <Animated.Text
            style={[styles.navBarTitle, { opacity: this.animatedTitleOpacity }]}
          >
            Navigation Bar
          </Animated.Text>
        </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

export default CollapsibleNavBar;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    position: 'absolute',
    top: -25,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? STATUS_BAR_HEIGHT : 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,.3)',
    height: NAV_BAR_HEIGHT,
    zIndex: 2,
  },
  navBarTitle: {
    color: 'white',
    fontSize: 20,
  },
  row: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    marginTop: Platform.OS === 'ios' ? STATUS_BAR_HEIGHT : 0,
    backgroundColor: 'transparent',
  },
  scrollViewContent: {
    paddingTop: NAV_BAR_HEIGHT,
  },
});

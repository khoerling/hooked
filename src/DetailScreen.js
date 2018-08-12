import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  Image,
  ListView,
  Dimensions,
  TouchableOpacity,
  Animated
} from 'react-native'

import CollapsibleNavBar from './CollapsibleNavBar'
import ParallaxScreen from './ParallaxScreen'
import PHOTOS from './data'

const maxWidth = Dimensions.get('window').width

export default class DetailScreen extends React.Component {
  state = {
    localPhoto: null,
    scrollToIndex: 0,
  }

  componentWillReceiveProps(nextProps) {
    const { photo } = nextProps
    if (photo) {
      const scrollToIndex = PHOTOS.findIndex(p => p.id === photo.id)
      this.setState({ localPhoto: photo, scrollToIndex })
    }
  }

  render() {
    const { onClose, openProgress, isAnimating } = this.props
    const { localPhoto } = this.state
    if (localPhoto) {
      return (
        <Animated.View
          style={[StyleSheet.absoluteFill]}
          pointerEvents={isAnimating || this.props.photo ? 'auto' : 'none'}
        >
          <Animated.Image
            ref={r => (this._openingImageRef = r)}
            source={localPhoto.source}
            style={{
              width: maxWidth,
              opacity: openProgress.interpolate({
                inputRange: [0, 0.50, 0.995],
                outputRange: [0, 0.7, 1]
              })
            }}
          />
          <Animated.View
            style={[
              styles.body,
              {
                opacity: openProgress.interpolate({
                  inputRange: [0, 0.50, 0.995],
                  outputRange: [0, .3, 1]
                }),
                transform: [
                  {
                    translateY: openProgress.interpolate({
                      inputRange: [0, 0.99, 0.995],
                      outputRange: [0, 0, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <ParallaxScreen scrollToIndex={this.state.scrollToIndex} />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              opacity: openProgress
            }}
            pointerEvents={isAnimating ? 'none' : 'auto'}
          >
            <TouchableOpacity
              hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
              onPress={() => onClose(localPhoto.id)}
              style={styles.closeButton}
            >
              <View>
                <Image style={styles.image} source={require('../assets/x.png')} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )
    }
    return <View />
  }
}

const styles = StyleSheet.create({
  title: {
    color: '#000',
    fontSize: 22,
    fontWeight: '600',
  },
  description: {
    color: '#333',
    fontSize: 14
  },
  body: { flex: 1, },
  closeButton: {
    marginTop: 10,
    marginRight: -23,
  },
  image: {
    height: 60,
    width: 60,
  }
})

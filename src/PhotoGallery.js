import React from 'react'
import { Platform, Easing, View, Animated } from 'react-native'
import { Haptic } from 'expo'
import PropTypes from 'prop-types'

import Transition from './Transition'
import DetailScreen from './DetailScreen'

const isDroid = Platform.OS !== 'ios'

class PhotoGalleryPhoto extends React.Component {
  state = {
    opacity: 1
  }

  static contextTypes = {
    onImageRef: PropTypes.func
  }

  setOpacity = opacity => {
    this.setState({ opacity })
  }

  render() {
    const { style, photo } = this.props
    const { opacity } = this.state
    return (
      <Animated.Image
        ref={i => {
          this.context.onImageRef(photo, i, this.setOpacity)
        }}
        style={[
          style,
          {
            opacity
          }
        ]}
        source={photo.source}
      />
    )
  }
}

export default class PhotoGallery extends React.Component {
  static Photo = PhotoGalleryPhoto

  initialLoad = true
  state = {
    photo: null,
    openProgress: new Animated.Value(0),
    isAnimating: false
  }

  _images = {}

  _imageOpacitySetters = {}

  static childContextTypes = {
    onImageRef: PropTypes.func
  }

  componentWillMount() {
    bus.addListener('storySelected', ([photo, cb]) => {
      this.setState({photo})
    })
  }
  getChildContext() {
    return { onImageRef: this._onImageRef }
  }

  _onImageRef = (photo, imageRef, setOpacity) => {
    this._images[photo.id] = imageRef
    this._imageOpacitySetters[photo.id] = setOpacity
  }

  open = photo => {
    const openFn = _ => {
      this._imageOpacitySetters[photo.id](
        this.state.openProgress.interpolate({
          inputRange: [0.005, 0.9],
          outputRange: [1, 0]
        })
      )
      this.setState({ photo, isAnimating: true }, () => {
        Animated.timing(this.state.openProgress, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        }).start(() => {
          this.setState({ isAnimating: false })
        })
      })
    }
    if (this.initialLoad) {
      this.initialLoad = false
      openFn()
    }
    if (!isDroid) Haptic.selection() // immediate feedback
    bus.emit('storySelected', [photo, openFn]) // photo is the full story
  }

  close = (photoId, index) => {
    bus.emit('photoGalleryClosed', {photoId, index})
    this.setState({ photo: null, isAnimating: true }, () => {
      Animated.timing(this.state.openProgress, {
        toValue: 0,
        duration: 300,
        easing: Easing.easeOutCubic,
        useNativeDriver: true
      }).start(() => {
        this._imageOpacitySetters[photoId](1)
        this.setState({ isAnimating: false })
      })
    })
  }

  render() {
    const { photo, openProgress, isAnimating } = this.state
    return (
      <View style={{ flex: 1 }}>
        {this.props.renderContent({ onPhotoOpen: this.open })}
        <Transition
          openProgress={openProgress}
          photo={photo}
          sourceImageRefs={this._images}
          isAnimating={isAnimating}
        />
        <DetailScreen
          photo={photo}
          onClose={this.close}
          openProgress={openProgress}
          isAnimating={isAnimating}
        />
      </View>
    )
  }
}

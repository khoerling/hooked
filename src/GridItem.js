import React from 'react'
import { StatusBar, Animated, Easing, StyleSheet, Text, View, TouchableHighlight, TouchableWithoutFeedback } from 'react-native'
import PhotoGallery from './PhotoGallery'
import { LinearGradient } from 'expo'

const Item = class Item extends React.Component {
  state = {
    opacity: new Animated.Value(1),
    scale: new Animated.Value(0),
  }

  buildInTitles = _ => {
    Animated.timing(this.state.opacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.easeOutExpo,
      useNativeDriver: true
    }).start()
    StatusBar.setHidden(false, true) // show
  }

  componentWillMount() {
    bus.addListener('photoGalleryClosed', this.buildInTitles)
  }

  componentWillUnmount() {
    bus.removeListener('photoGalleryClosed', this.buildInTitles)
  }

  render() {
    const
      { item, onPhotoOpen } = this.props,
      scale = this.state.scale.interpolate({
        inputRange: [0, 0.00001, 0.8, 1],
        outputRange: [1, .99, 1.016, 1],
      })
    return (
      <Animated.View style={{transform: [{scale}]}}>
        <TouchableHighlight
          style={{
            borderRadius: 4,
            shadowOffset:{  width: 1,  height: 1,  },
            shadowColor: '#111',
            overflow: 'hidden',
            shadowOpacity: .8,
            elevation: 1,
          }}
          onPress={() => {
            Animated.timing(this.state.scale, {
              toValue: 1,
              duration: 150,
              easing: Easing.easeInExpo,
              useNativeDriver: true
            }).start(_ => this.state.scale.setValue(0))
            onPhotoOpen(item)
            this.state.opacity.setValue(0)
            StatusBar.setHidden(true, false) // hide
          }}>
          <View>
          <PhotoGallery.Photo
            photo={item}
            style={{
              width: item.width - 5,
              height: item.height
            }}
            />
          <Animated.View style={[styles.container, {opacity: this.state.opacity}]}>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,.2)', 'rgba(0,0,0,.7)', 'rgba(0,0,0,.99)']} style={styles.gradient}>
              <View style={{flex: 1}}>
                <Text style={styles.h1}>{item.title}</Text>
                <Text style={styles.h2}>{item.genre.toUpperCase()}</Text>
              </View>
            </LinearGradient>
          </Animated.View>
          </View>
        </TouchableHighlight>
      </Animated.View>)
  }
}


const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  h1: {
    fontFamily: 'iowan',
    fontSize: 25,
    lineHeight: 24,
    letterSpacing: -1,
    color: '#fff',
    fontWeight: 'bold',
    paddingBottom: 5,
    paddingRight: 5,
  },
  h2: {
    fontFamily: 'iowan',
    fontSize: 13,
    lineHeight: 15,
    color: '#fff',
    opacity: .9,
    fontWeight: 'bold',
    paddingBottom: 5,
    paddingRight: 5,
  },
  gradient: {
    flex: 1,
    paddingTop: 150,
    paddingLeft: 10,
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
})
export default Item

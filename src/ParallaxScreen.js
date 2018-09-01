import React from 'react'
import Drawer from 'react-native-bottom-drawer'
import { Easing, Platform, PanResponder, TouchableWithoutFeedback, Animated, StyleSheet, Image, Text, View, Dimensions } from 'react-native'
import { ParallaxSwiper, ParallaxSwiperPage } from "react-native-parallax-swiper"
import { Haptic } from 'expo'
import { LinearGradient } from 'expo'

import Icon from 'react-native-vector-icons/Ionicons'
import CollapsibleNavBar from './CollapsibleNavBar'
import data from './data'
import Message from './Message'
import { get, set } from './storage'

const
  { width, height } = Dimensions.get("window"),
  isDroid = Platform.OS !== 'ios',
  gradients = {
    light: ['transparent', 'rgba(0,0,0,.2)', 'rgba(0,0,0,.5)', 'rgba(0,0,0,.79)'],
    dark: ['transparent', 'rgba(255,255,255,.2)', 'rgba(255,255,255,.5)', 'rgba(255,255,255,.79)']
  }

export default class App extends React.Component {
  _shouldRender = true
  _closed = false
  animationTimeout = 300
  swipeAnimatedValue = new Animated.Value(0)
  state = {
    storyOpacity: new Animated.Value(1),
    buildInLastMessage: new Animated.Value(1),
    translateY: new Animated.Value(0),
    isDrawerOpen: false,
    scrollToIndex: this.props.scrollToIndex || 0,
    messageIndex: 1,
  }


  story = s => data[s || this.state.scrollToIndex]
  saveMessageIndex = _ => set(`msgs:${this.state.scrollToIndex}`, this.state.messageIndex)
  messageIndex = async scrollToIndex => (await get(`msgs:${scrollToIndex || this.state.scrollToIndex}`)) || 1
  isLastMessage = (story, index) => index === 2

  componentWillUnmount() {
    bus.removeEventListener('photoGalleryClosed') // cleanup
    this.saveMessageIndex()
  }

  async componentWillMount() {
    bus.addListener('photoGalleryClosed', _ => {
      this._closed = true
      setTimeout(_ => {
        this.closeDrawer()
        this._closed = false
      }, this.animationTimeout)
    })
    bus.addListener('storySelected', async ([story, fn]) => {
      if (!this._shouldRender) return // guard
      this.state.storyOpacity.setValue(0)
      const
        scrollToIndex = data.findIndex(d => d.id === story.id),
        cb = fn || (_ => {})
      this.setState({
        // restore read-point & index
        scrollToIndex,
        messageIndex: await this.messageIndex(scrollToIndex),
      }, _ => {
        // cb()
        Animated.timing(this.state.storyOpacity, {
          useNativeDriver: true,
          easing: Easing.easeOutCubic,
          toValue: 1,
          duration: 125,
        }).start()
      })
    })
    // load initial index
    this.setState({messageIndex: await this.messageIndex(this.state.scrollToIndex)})
  }

  openDrawer() {
    if (this._close) {
      // cancel close
      clearTimeout(this._close)
      this._close = null
    }
    if (this.state.isDrawerOpen) return // guard
    this.setState({isDrawerOpen: true, isOnTop: true}, _ => {
      // if (this._drawer) this._drawer.open()
      if (!isDroid) Haptic.notification(Haptic.NotificationTypes.Success)
      global.scrollDrawerBottom()
      bus.emit('openedDrawer')
    })
  }

  closeDrawer() {
    bus.emit('closedDrawer', true)
    this.setState(
      {isDrawerOpen: false},
      _ => this.state.storyOpacity.setValue(1))
    if (this._close) { // guard
      clearTimeout(this._close)
      this._close = null
    } else {
      this._close= setTimeout(_ =>
        this.setState({isOnTop: false}, this._drawer.close()),
        this.animationTimeout * 3)
    }
  }

  onStartDrag() {
    this.setState({isOnTop: true})
  }
  // onStopDrag() {
  //   if (this.state.isDrawerOpen) {
  //     bus.emit('openedDrawer')
  //   } else {
  //     bus.emit('closedDrawer')
  //   }
  // }

  onScrollBegin(scrollToIndex) {
    if (this._endTimer) clearTimeout(this._endTimer)
    Animated.timing(this.state.translateY, {
      useNativeDriver: true,
      easing: Easing.easeOutCubic,
      toValue: 50,
      duration: 175,
    }).start()
  }

  onScrollEnd(scrollToIndex) {
    if (this._endTimer) clearTimeout(this._endTimer)
    this._endTimer =
      setTimeout(_ => {
        // update index and bounce bottom-drawer teaser in
        this.setState({scrollToIndex}, _ => {
          if (this._closed) {
            this.state.translateY = new Animated.Value(0)
            return // guard
          }
          this._shouldRender = false
          bus.emit('storySelected', [this.story(scrollToIndex), null])
          if (this._timer) clearTimeout(this._timer)
          this._timer = setTimeout(_ => this._shouldRender = true, 200)
          this.state.translateY.setValue(0)
          if (!isDroid) Haptic.impact(Haptic.ImpactStyles.Light)
        })
      }, 400)
  }

  async onPress(params) {
    if (!this.state.isDrawerOpen) {
      this.openDrawer()
    } else {
      this.setState({messageIndex: this.state.messageIndex + 1}, _ => {
        // if (params && params.animated)
        //   Animated.spring(this.state.buildInLastMessage, {
        //     toValue: 1,
        //     velocity: 1.5,
        //     bounciness: .1,
        //   }).start()
        if (!isDroid) Haptic.selection()
        this.saveMessageIndex()
      })
    }
  }

  render() {
    const
      story = this.story(),
      messages =
        []
        .concat({from: 'narration'})
        .concat({from: 'narration'})
        .concat(
          story
            .messages
            .slice(0, this.state.messageIndex))
    // return (<View style={{flex: 1, backgroundColor: 'blue'}}/>)
    return (
      <View style={{flex: 1}}>
                  <Image
                    style={styles.backgroundImage}
                    source={{ uri: story.source.uri }} />
                  <LinearGradient colors={gradients[story.theme || 'light']} style={[styles.foregroundTextContainer, {opacity: this.state.isDrawerOpen ? 0 : 1}]}>
                    {this.state.isDrawerOpen
                      ? null
                      : <View>
                          <TouchableWithoutFeedback onPress={_ => this.openDrawer()}>
                            <Animated.View style={{opacity: this.state.storyOpacity}}>
                              <Text style={[styles.foregroundText, story.theme ? styles[story.theme] : null]}>{story.title.toUpperCase()}</Text>
                              <Text style={[styles.authorText, story.theme ? styles[story.theme] : null]}>{story.postedBy.toUpperCase()}</Text>
                              <Text style={[styles.abstractText, story.theme ? styles[story.theme] : null]}>{story.abstract}</Text>
                            </Animated.View>
                          </TouchableWithoutFeedback>
                        </View>
                    }
                  </LinearGradient>
        <Animated.View
          style={[
            {transform: [{translateY: this.state.translateY}]},
            this.state.isOnTop ? {...StyleSheet.absoluteFillObject} : {...StyleSheet.absoluteFillObject, top: height - 100}]}>
          <View style={[styles.headerIcon, this.state.isOnTop ? {opacity: 0} : null]}>
            <Icon name={'ios-arrow-down'} size={35} color="red" />
          </View>
          <Drawer
            onPress={_ => this.onPress()}
            ref={r => this._drawer = r}
            inverted={this.state.isDrawerOpen}
            onOpen={_ => this.openDrawer()}
            onClose={_ => this.closeDrawer()}
            onStartDrag={_ => this.onStartDrag()}
            headerHeight={0}
            teaserHeight={135}
            itemHeight={130}
            headerIcon={'md-arrow-back'}
            data={messages}
            renderItem={
              ({index, item, separators}) => <Message
                key={index}
                item={item}
                index={index}
                style={this.isLastMessage(item, index) ? {transform: [{scale: this.state.buildInLastMessage}]} : null}
                theme={story.theme}
                onPress={_ => this.onPress({animated: true})} />}
                header={''} />
        </Animated.View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    width,
    height,
  },
  headerIcon: {
    flex: 1,
    alignSelf: 'center',
    paddingTop: 30,
    marginVertical: 20,
  },
  foregroundTextContainer: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: "transparent",
    position: 'absolute',
    bottom: 0,
    paddingBottom: 60,
    paddingTop: 30,
    left: 0,
    right: 0,
  },
  foregroundText: {
    fontFamily: 'iowan',
    alignSelf: 'center',
    textAlign: 'center',
    paddingHorizontal: 12,
    flex: 1,
    flexDirection: 'row',
    fontSize: 34,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: 0.41,
    color: "white"
  },
  abstractText: {
    fontFamily: isDroid ? 'serif' : 'Times New Roman',
    alignSelf: 'center',
    textAlign: 'justify',
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,.85)',
  },
  authorText: {
    fontFamily: 'iowan',
    textAlign: 'center',
    alignSelf: 'center',
    fontSize: 14,
    marginTop: 0,
    marginBottom: 7,
    fontWeight: "700",
    color: 'rgba(255,255,255,.85)',
  },
  dark: {
    color: 'rgba(0,0,0,.8)',
  },
  downArrow: {
    color: '#eee',
  }
})

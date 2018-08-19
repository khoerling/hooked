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
    buildInLastMessage: new Animated.Value(1),
    translateY: new Animated.Value(0),
    isDrawerOpen: false,
    scrollToIndex: this.props.scrollToIndex || 0,
    messageIndex: 1,
  }

  getPageTransformStyle = index => ({
    transform: [
      {
        scale: this.swipeAnimatedValue.interpolate({
          inputRange: [
            (index - 1) * (width + 8), // Add 8 for dividerWidth
            index * (width + 8),
            (index + 1) * (width + 8)
          ],
          outputRange: [-.8, 1, -.8],
          extrapolate: "clamp"
        })
      },
      {
        rotate: this.swipeAnimatedValue.interpolate({
          inputRange: [
            (index - 1) * (width + 8),
            index * (width + 8),
            (index + 1) * (width + 8)
          ],
          outputRange: ["80deg", "0deg", "-80deg"],
          extrapolate: "clamp"
        })
      }
    ]
  })

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
      const
        scrollToIndex = data.findIndex(d => d.id === story.id),
        cb = fn || (_ => {})
      this.setState({
        // restore read-point & index
        scrollToIndex,
        messageIndex: await this.messageIndex(scrollToIndex),
      }, _ => {setTimeout(cb, 1)})
    })
  }

  openDrawer() {
    if (this._close) {
      // cancel close
      clearTimeout(this._close)
      this._close = null
    }
    this.setState({isDrawerOpen: true, isOnTop: true})
    if (this._drawer) this._drawer.open()
    if (!isDroid) Haptic.notification(Haptic.NotificationTypes.Success)
    global.scrollDrawerBottom()
  }

  closeDrawer() {
    this.setState({isDrawerOpen: false})
    if (this._close) { // guard
      clearTimeout(this._close)
      this._close = null
    } else {
      this._close= setTimeout(_ =>
        this.setState({isOnTop: false}, this._drawer.close()),
        this.animationTimeout)
    }
    global.scrollDrawerBottom()
  }

  onStartDrag() {
    this.setState({isOnTop: true})
  }
  onStopDrag() {
    setTimeout(_ => this.setState({isOnTop: this.state.isDrawerOpen ? true : false}), this.animationTimeout)
  }

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
      if (this.state.isDrawerOpen) setTimeout(_ => global.scrollDrawerBottom({animated: true}), 150)
      this.setState({messageIndex: this.state.messageIndex + 1}, _ => {
        if (params && params.animated)
          Animated.spring(this.state.buildInLastMessage, {
            toValue: 1,
            velocity: 1.5,
            bounciness: .1,
          }).start()
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
            .slice(0, this.state.messageIndex)
            .reverse())
    return (
      <View style={{flex: 1}}>
        <ParallaxSwiper
          speed={0.2}
          animatedValue={this.swipeAnimatedValue}
          dividerWidth={8}
          dividerColor="black"
          backgroundColor="black"
          onMomentumScrollEnd={i => this.onScrollEnd(i)}
          onScrollBeginDrag={i => this.onScrollBegin(i)}
          showsHorizontalScrollIndicator={false}
          progressBarThickness={0}
          showProgressBar={false}
          scrollToIndex={this.state.scrollToIndex}
          progressBarBackgroundColor="rgba(0,0,0,0.25)"
          progressBarValueBackgroundColor="#000">
          {data.map((story, ndx) =>
            (
              <ParallaxSwiperPage key={story.id + 'page'}
                BackgroundComponent={
                  <Image
                    style={styles.backgroundImage}
                    source={{ uri: story.source.uri }} />
                }
                ForegroundComponent={
                  <LinearGradient colors={gradients[story.theme || 'light']} style={[styles.foregroundTextContainer, {opacity: this.state.isDrawerOpen ? 0 : 1}]}>
                    {this.state.isDrawerOpen
                      ? null
                      : <Animated.View
                          style={[
                            this.getPageTransformStyle(ndx),
                            {
                              opacity: this.swipeAnimatedValue.interpolate({
                                inputRange: [
                                  (ndx - 1) * (width + 8), // Add 8 for dividerWidth
                                  ndx * (width + 8),
                                  (ndx + 1) * (width + 8)
                                ],
                                outputRange: [-2, 1, -2],
                              }),
                            },
                          ]}>
                          <TouchableWithoutFeedback onPress={_ => this.openDrawer()}>
                            <View>
                              <Text style={[styles.foregroundText, story.theme ? styles[story.theme] : null]}>{story.title.toUpperCase()}</Text>
                              <Text style={[styles.authorText, story.theme ? styles[story.theme] : null]}>{story.postedBy.toUpperCase()}</Text>
                              <Text style={[styles.abstractText, story.theme ? styles[story.theme] : null]}>{story.abstract}</Text>
                            </View>
                          </TouchableWithoutFeedback>
                        </Animated.View>
                    }
                  </LinearGradient>
                }
              />
            ))}
          </ParallaxSwiper>
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
            onOpen={_ => this.setState({isDrawerOpen: true})}
            onClose={_ => this.closeDrawer()}
            onStartDrag={_ => this.onStartDrag()}
            onStopDrag={_ => this.onStopDrag()}
            headerHeight={0}
            teaserHeight={135}
            itemHeight={130}
            headerIcon={'md-arrow-back'}
            data={messages}
            renderItem={
              ({index, item, separators}) => <Message
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

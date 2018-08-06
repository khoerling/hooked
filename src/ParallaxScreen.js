import React from 'react'
import Drawer from 'react-native-bottom-drawer'
import { StatusBar, Platform, PanResponder, TouchableWithoutFeedback, Animated, StyleSheet, Image, Text, View, Dimensions } from 'react-native'
import { ParallaxSwiper, ParallaxSwiperPage } from "react-native-parallax-swiper"
import { Haptic } from 'expo'
import { BlurView } from 'expo'

import data from './data'
import Message from './Message'
import { get, set } from './storage'

const
  { width, height } = Dimensions.get("window"),
  isDroid = Platform.OS !== 'ios'

export default class App extends React.Component {
  animationTimeout = 100
  swipeAnimatedValue = new Animated.Value(0)
  state = {
    buildInLastMessage: new Animated.Value(1),
    scale: new Animated.Value(1),
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
    bus.addListener('photoGalleryClosed', _ => setTimeout(_ => this.closeDrawer(), this.animationTimeout))
    bus.addListener('storySelected', async ([story, fn]) => {
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
    StatusBar.setHidden(true, false) // hide
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
    StatusBar.setHidden(false, true) // show
  }

  onStartDrag() {
    this.setState({isOnTop: true})
    StatusBar.setHidden(true, true) // hide & show
  }
  onStopDrag() {
    setTimeout(_ => this.setState({isOnTop: this.state.isDrawerOpen ? true : false}), this.animationTimeout)
    StatusBar.setHidden(!this.state.isDrawerOpen, false) // hide & show
  }

  onScrollBegin(scrollToIndex) {
    if (this._endTimer) clearTimeout(this._endTimer)
  }
  onScrollEnd(scrollToIndex) {
    if (this._endTimer) clearTimeout(this._endTimer)
    if (scrollToIndex === this.state.scrollToIndex) return false
    if (scrollToIndex === this.lastScrollToIndex) return false
    this.lastScrollToIndex = scrollToIndex
    this._endTimer =
      setTimeout(_ => {
        // update index and bounce bottom-drawer teaser in
        this.setState({scrollToIndex}, _ => {
          bus.emit('storySelected', [this.story(scrollToIndex), null])
          Animated.spring(this.state.scale, {
            toValue: 1,
            velocity: 1.5,
            bounciness: .1,
          }).start()
          if (!isDroid) Haptic.impact(Haptic.ImpactStyles.Light)
        })
      }, 200)
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
      translateY = this.state.scale.interpolate({
        inputRange: [0, .0001, .9, 1],
        outputRange: [0, -20, 35, 0],
      }),
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
                  <BlurView intensity={65} key={story.id} style={[styles.foregroundTextContainer, {opacity: this.state.isDrawerOpen ? 0 : 1}]}>
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
                  </BlurView>
                }
              />
            ))}
          </ParallaxSwiper>
        <Animated.View
          style={[
            {transform: [{translateY}]},
            this.state.isOnTop ? {...StyleSheet.absoluteFillObject} : {...StyleSheet.absoluteFillObject, top: height - 100}]}>
          <Drawer
            onPress={_ => this.onPress()}
            ref={r => this._drawer = r}
            inverted={this.state.isDrawerOpen}
            onOpen={_ => this.setState({isDrawerOpen: true})}
            onClose={_ => this.closeDrawer()}
            onStartDrag={_ => this.onStartDrag()}
            onStopDrag={_ => this.onStopDrag()}
            headerHeight={0}
            teaserHeight={145}
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
  foregroundTextContainer: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: "transparent",
    position: 'absolute',
    bottom: 0,
    paddingBottom: 30,
    paddingTop: 15,
    paddingLeft: 25,
    left: 0,
    right: 0,
  },
  foregroundText: {
    fontFamily: 'iowan',
    flex: 1,
    flexDirection: 'row',
    marginRight: 25,
    fontSize: 34,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: 0.41,
    color: "white"
  },
  abstractText: {
    fontFamily: 'iowan',
    fontSize: 13,
    fontWeight: '400',
    paddingRight: 25,
    color: 'rgba(255,255,255,.85)',
  },
  authorText: {
    fontFamily: 'iowan',
    fontSize: 14,
    marginTop: 0,
    marginBottom: 3,
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

import React, { Component, PureComponent } from 'react'
import { StatusBar, Platform, TouchableWithoutFeedback, Animated, StyleSheet, Image, Text, ListView, View, Dimensions } from 'react-native'

import PHOTOS from './src/data'
import { processImages, buildRows, normalizeRows } from './src/utils'
import PhotoGallery from './src/PhotoGallery'
import GridItem from './src/GridItem'
import EventEmitter from 'EventEmitter'
import { AppLoading, Font } from 'expo'

const
  { width, height } = Dimensions.get("window"),
  js = JSON.stringify,
  cw = (...args) => console.warn(args),
  bus = new EventEmitter(),
  isDroid = Platform.OS !== 'ios'

Object.assign(global, {cw, js, bus})

// preload fonts
const processedImages = processImages(PHOTOS)
let rows = buildRows(processedImages, width)
rows = normalizeRows(rows, width)

const ds = new ListView.DataSource({
  rowHasChanged: (r1, r2) => r1 !== r2
})


// <App>
// ---------
export default class App extends Component {
  state = {
    dataSource: ds.cloneWithRows(rows),
    isReady: false,
  }

  async _cacheResourcesAsync() {
    const tasks = [
      // load fonts
      await Font.loadAsync({
        'iowan': require('./assets/fonts/IowanOldStBTRoman.ttf'),
      }),
    ]
    return Promise.all(tasks)
  }

  renderRow = (onPhotoOpen, row) =>
    <View
      style={{
        flexDirection: 'row',
        marginBottom: 5,
        justifyContent: 'space-between'
      }}>
      {row.map(item =>
        <GridItem item={item} key={item.id} onPhotoOpen={onPhotoOpen} />
      )}
    </View>

  componentDidMount() {
    // bus.addListener('photoGalleryClosed', ({photoId, index}) => {
    //   this.listView.scrollTo({ y: Math.floor(300 * (index / 2)), animated: false });
    // })
  }

  render() {
    if (!this.state.isReady) {
      return (
        <AppLoading
          startAsync={this._cacheResourcesAsync}
          onFinish={() => this.setState({ isReady: true })}
          onError={console.warn}
          />
      )
    }
    return (
      <View style={{flex: 1, backgroundColor: '#000'}}>
        <StatusBar barStyle={'dark-content'} hidden={false} />
        <PhotoGallery
          renderContent={({ onPhotoOpen }) =>
            <ListView
              ref={(ref) => this.listView = ref}
              dataSource={this.state.dataSource}
              renderRow={this.renderRow.bind(this, onPhotoOpen)}
            />}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})

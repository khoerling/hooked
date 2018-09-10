import React from 'react'
import {
  Text,
  Clipboard,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  View,
  ViewPropTypes,
  Platform,
  Dimensions,
} from 'react-native'

const
  isDroid = Platform.OS !== 'ios',
  screen = Dimensions.get('window')

export default class Message extends React.Component {
  render() {
    const {item, theme, style, onPress} = this.props
    if (!item) return <View style={{height: 20}}></View> // guard
    return (
      <TouchableWithoutFeedback onPress={_ => onPress()}>
        {item.from === 'narration'
          ? <Animated.View style={[{flex: 1, paddingHorizontal: 30, justifyContent: 'center'}, style ? style : null]}>
              <Text
                selectable={true}
                style={[
                  styles.narration,
                  theme ? styles[`${theme}Narration`] : null]}>
                {item.msg}
              </Text>
            </Animated.View>
          : <Animated.View style={[
              styles.container,
              item.right ? styles.containerRight : null,
              style ? style : null,
            ]}>
            <View style={[
              styles.content,
              item.adjacent ? styles.adjacent : null,
              item.right ? styles.contentRight : null,
              theme ? styles[`${theme}Content`] : null,
            ]}>
              {item.adjacent
                ? null
                : item.from
                  ? <Text
                      selectable={true}
                      style={[
                        styles.from,
                        item.right ? styles.right : null,
                        theme ? styles[`${theme}${item.right ? 'Right' : ''}From`] : null,
                        ]}>
                        {item.from}
                    </Text>
                  : null}
              <Text
                selectable={true}
                style={[
                  styles.body,
                  theme ? styles[`${theme || ''}Body`] : null,
                  item.right ? styles.bodyRight : null,
                  ]}>
                  {item.msg}
              </Text>
            </View>
            </Animated.View>
        }
      </TouchableWithoutFeedback>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: screen.width,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,.94)',
    marginTop: 10,
    marginHorizontal: 10,
    maxWidth: screen.width * .75,
  },
  adjacent: {
    marginTop: 2,
    borderRadius: 5,
  },
  darkNarration: {
    color: '#aaa',
  },
  narration: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'rgba(255,255,255,.9)',
    marginVertical: 20,
    marginBottom: 30,
    marginHorizontal: 25,
  },
  bodyRight: {
    color: '#fff',
    fontSize: 17,
    textAlign: 'right',
  },
  containerRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  contentRight: {
    backgroundColor: '#777',
  },
  body: {
    fontSize: 18,
  },
  darkContent: {
    backgroundColor: 'rgba(50,50,50,.94)',
  },
  darkBody: {
    color: '#eee',
  },
  darkRightFrom: {
    color: 'orange',
  },
  darkFrom: {
    color: 'red',
  },
  darkRight: {
    color: "#aaa",
  },
  right: {
    alignSelf: 'flex-end',
    color: "#333",
  },
  from: {
    fontWeight: "bold",
    color: 'green',
    opacity: .8,
    fontSize: 13,
    marginBottom: 5,
  }
})

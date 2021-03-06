import Keyboard from './keyboard';
import QueryBox from './querybox'
import * as actions from './actions'
import * as types from './actiontypes'
import React, { Component } from 'react';
import request from 'superagent';
import { connect } from 'react-redux'

function combineRoutableProp(propName, state, params) {
  let stateValue = state.app.get(propName)
  if (stateValue === undefined) {
    stateValue = params[propName]
  }
  return stateValue
}

function logOverflow(msg) {
  console.log(msg)
}

@connect((state, ownProps) => ({
  setSearchedQuery: state.app.get('query') === undefined,
  query: ((()=> {
    if (state.app.get('query') === undefined) {
      return combineRoutableProp('searchedQuery', state, ownProps.params) || ''
    } else {
      return state.app.get('query') || ''
    }
  })()),
  searchedQuery: combineRoutableProp('searchedQuery', state, ownProps.params) || '',
  offset: combineRoutableProp('offset', state, ownProps.params),
  searching: state.app.get('searching'),
  results: state.app.get('results'),
  error: state.app.get('error'),
  fake: state.app.get('fake'),
  showingQueryBox: state.app.get('showingQueryBox'),
  hoveredResultId: state.app.get('hoveredResultId'),
  imageLoadedTime: state.app.get('imageLoadedTime'),
  overflow: state.app.get('overflow'),
  hoveredImageBoundingBox: state.app.get('hoveredImageBoundingBox'),
}))
class App extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.dispatch(actions.giphySearch({query: this.props.query}))
  }

  onChange = (e) => {
    this.props.dispatch(actions.setQuery(e.target.value))
  };

  onSubmit = (e) => {
    e.preventDefault()
    this.props.dispatch(actions.giphySearch({offset: 0}))
  };

  nextPage() {
    this.props.dispatch(actions.nextPage())
  }

  prevPage() {
    this.props.dispatch(actions.prevPage())
  }

  onFakeChange = (e) => {
    this.props.dispatch(actions.fake(e.target.checked))
  };

  onMouseOver = (result, e) => {
    if (this.props.overflow) {
      logOverflow('Mouseover at ' + (new Date).toString() + ': in overflow mode, not expanding')
      return
    }
    
    //debugger
    logOverflow('Mouseover at ' + (new Date).toString() + ': expanding')
    this.props.dispatch({type: types.SET_HOVERED_RESULT,
      hoveredResultId: result.id})
      
    let elt = document.querySelector('*[data-id="'+result.id+'"]')
    let bounds = elt.getBoundingClientRect()
    bounds = {
      left: Math.floor(bounds.left),
      top: Math.floor(bounds.top),
      right: Math.ceil(bounds.right),
      bottom: Math.ceil(bounds.bottom),
    }
    if (e.clientX < bounds.left || e.clientX > bounds.right ||
      e.clientY < bounds.top || e.clientY > bounds.bottom)
    {
      debugger
      console.log('cursor position not within element bounds')
    }
    //debugger
    this.props.dispatch(actions.setHoveredImageBoundingBox(bounds))
    logOverflow('Box is ' + bounds.left + ', ' + bounds.top + ' - ' + bounds.right + ', ' + bounds.bottom)
  };

  onMouseOut = (result, e) => {
  //debugger
    const now_date = new Date
    if (this.props.overflow) {
      logOverflow('Mouseout at ' + now_date.toString() + ': in overflow mode, not collapsing')
      return
    }
    
    logOverflow('out at ' + e.clientX + ', ' + e.clientY)
    if (this.props.hoveredImageBoundingBox) {
      logOverflow('checking for overflow')
      if (e.clientX > this.props.hoveredImageBoundingBox.left && e.clientX < this.props.hoveredImageBoundingBox.right &&
        e.clientY > this.props.hoveredImageBoundingBox.top && e.clientY < this.props.hoveredImageBoundingBox.bottom
      ) {
        logOverflow('Mouseout at ' + now_date.toString() + ': entering overflow mode via position')
        this.props.dispatch(actions.overflow())
        return
        
      }
    }
      /*
    const now = now_date.valueOf()
    if (now < this.props.imageLoadedTime + 500) {
      logOverflow('Mouseout at ' + now_date.toString() + ': entering overflow mode')
      this.props.dispatch(actions.overflow())
      return
    }
    logOverflow('Mouseout at ' + now_date.toString() + ': collapsing')
    */
    this.props.dispatch({type: types.SET_HOVERED_RESULT,
      hoveredResultId: null})
  };
  
  onClick = (result, e) => {
    logOverflow('Click at ' + (new Date).toString() + ': clearing overflow')
    this.props.dispatch(actions.clearOverflow())
    this.props.dispatch({type: types.SET_HOVERED_RESULT,
      hoveredResultId: result.id})
  };

  render() {
    let results
    if (this.props.results === undefined) {
      results = []
    } else {
      results = this.props.results.toJS()
    }
    let fake = this.props.fake
    return (
      <div onKeyDown={this.onKeyDown}>
        <h1>Giphy Search</h1>
        <div>
          <form onSubmit={this.onSubmit.bind(this)} style={formStyle}>
            <input type='text' name='query' value={this.props.query}
              onChange={this.onChange} />
            <input type='submit' value='Do it' />
          </form>
          <div style={buttonBlockStyle}>
            <input type='button' value='Next page' onClick={this.nextPage.bind(this)}
              style={buttonStyle} />
            <input type='button' value='Prev page' onClick={this.prevPage.bind(this)}
              style={buttonStyle} />
          </div>
          <label htmlFor='fake-requests' style={fakeStyle}>
            <input type='checkbox' id='fake-requests' onChange={this.onFakeChange}
              checked={fake}/>
            Fake requests
          </label>
        </div>

        {this.props.searching &&
          <p>Loading...</p>
        }
        {this.props.error &&
          <div>
            <p>There was an error searching Giphy! What now??</p>
          </div>
        }
        { this.props.error &&
          <div>
            <p>Error: {this.props.error}</p>
          </div>
        }

        <div style={{clear:'both'}}>
          { results.length > 0 &&
            <div>
              <h2>Results</h2>
              {results.map(function(result, i) {
                return <div data-id={result.id} key={result.id} style={{float:'left', margin:'5px'}}
                  onMouseOver={(e)=>(this.onMouseOver(result, e))}
                  onMouseOut={(e)=>(this.onMouseOut(result, e))}
                  onClick={(e)=>(this.onClick(result, e))}
                >
                  {this.props.hoveredResultId === result.id ?
                    this.renderBigImage(result) :
                    this.renderSmallImage(result)
                  }
                </div>
              }.bind(this))}
            </div>
          }
        </div>
        {this.props.showingQueryBox && <QueryBox />}
        <Keyboard />
      </div>
    );
  }
  
  renderSmallImage(result) {
    return <img src={result.images.fixed_height_small.url} />
  }
  
  renderBigImage(result) {
    return <img src={result.images.original.url} onLoad={this.onBigImageLoaded.bind(this)} />
  }
  
  onBigImageLoaded() {
    const now_date = new Date
    const now = now_date.valueOf()
    this.props.dispatch(actions.setImageLoadedTime(now))
    logOverflow('Image loaded at ' + now_date.toString())
  }
}

const formStyle = {
  float: 'left',
}

const fakeStyle = {
  float: 'right',
}

const nextStyle = {
  float: 'left',
  marginLeft: '1em',
}

const buttonStyle = {
  float: 'left',
}

const buttonBlockStyle = {
  float: 'left',
  margin: '0 1em',
}

export default App;

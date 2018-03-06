/*React component to create map and location cards. This component also supports filtering of data based on the allowed location type or tag*/
class CardViewComponent extends React.Component {

    constructor(props) {
        super(props);
        this.typesEl;
        this.cardsEl;
        this.contentEl;
        this.state = {
            items: [],
            dataError: {
                isError: false,
                errorMsg: null
            },
            types: new Set(),
            selectedType: [],
            filteredData: [],
            allowedTypes: systemProperties['allowedTypes'],
            allowedData: []
        };
    }

    //Get the location before the component mount
    componentWillMount() {
        this.getLocation();
    }

    //Update the cards container height once the UI updates
    componentDidUpdate() {
        this.typesEl || (this.typesEl = document.getElementById('locationTypes'));
        this.cardsEl || (this.cardsEl = document.getElementById('locationCards'));
        this.contentEl || (this.contentEl = document.getElementById('content'));
        this.cardsEl.style.height = (this.contentEl.offsetHeight - this.typesEl.offsetHeight)+'px';
    }

    getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this.showPosition.bind(this));
        } else {
            this.setState({dataError: {isError: true, errorMsg: 'Geolocation is not supported by this browser.'}});
        }
    }

    showPosition(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.initMap(latitude, longitude);
    }

    //Initializing the map and calling the initial set of data points using Google APIs
    initMap(latitude, longitude) {
        const coordinates = {lat: latitude, lng: longitude};
        this.map = new google.maps.Map(document.getElementById('map'), {
            center: coordinates,
            zoom: 14
        });
        this.infowindow = new google.maps.InfoWindow();
        const service = new google.maps.places.PlacesService(this.map);
        service.nearbySearch({
            location: coordinates,
            radius: systemProperties['searchRadius'],
            type: this.state.allowedTypes
        }, this.processDataPoints.bind(this));
    }

    //Process the data points: extract type from the dataset and update the state model
    processDataPoints(results, status, pagination) {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            this.setState({dataError: {isError: true, errorMsg: 'Unable to fetch data for your location'}});
            return;
        }
        const dataItems = this.state.items.concat(results);
        this.setState({items: dataItems});
        let newfilterData = this.state.filteredData;
        for (let i = 0; i < results.length; i++) {
            results[i].types.map(type => {/*if(this.state.allowedTypes.indexOf(type) > -1) { */newfilterData.push(results[i]); this.createMarker(results[i]); return;/*}*/});
        }
        const uniqueDataSet = Array.from(new Set(newfilterData));
        if(uniqueDataSet && uniqueDataSet.length > 0) {
            this.setState({filteredData: uniqueDataSet});
            this.setState({allowedData: uniqueDataSet});
            if (pagination.hasNextPage) {
                pagination.nextPage();
            }
        } else {
            this.setState({dataError: {isError: true, errorMsg: 'Unable to fetch data for your location'}});
        }

    }

    //Create markers on the map and attaching the listeners to show place name on clicking the map markers
    createMarker(place) {
        const placeLoc = place.geometry.location;
        const marker = new google.maps.Marker({
            map: this.map,
            position: placeLoc,
            infoWindow: this.infowindow
        });
        google.maps.event.addListener(marker, 'click', function() {
            this.infoWindow.setContent(place.name);
            this.infoWindow.open(this.map, this);
        });
    }

    //Return unique set of allowed types from the dataset type array
    getUniqueTypes() {
        let typesSet = this.state.types;
        this.state.items.map(item => (item.types.map(type => {if(this.state.allowedTypes.indexOf(type) > -1) typesSet.add(type)})));
        return Array.from(typesSet);
    }

    //Transform the numerical rating into visual representation
    getRatingStarts(rating) {
        let ratingStarts = '';
        for(let i = 0; i < rating; i++) {
            ratingStarts = ratingStarts + '★';
        }
        return ratingStarts;
    }

    //Legend click handler to update the selected type and component state
    handleTypeSelection(e) {
        const selectedCat = e.target.dataset.category;
        this.toggleLegendState(e.target);
        let selectedTypes = this.state.selectedType;
        if(selectedTypes.indexOf(selectedCat) > -1) {
            selectedTypes.splice(selectedTypes.indexOf(selectedCat), 1);
        } else {
            selectedTypes.push(selectedCat);
        }
        this.setState({selectedType: selectedTypes});
        this.filterDataSet(selectedTypes);
    }

    //Toggle the legend visual representation
    toggleLegendState(el) {
        if(el.classList.contains('legendSelected')) {
            el.classList.remove('legendSelected');
        } else {
            el.classList.add('legendSelected');
        }
    }

    //Filter the dataset based on the selected legends
    filterDataSet(selectedTypes) {
        if(selectedTypes && selectedTypes.length > 0) {
            let itemSet = new Set();
            this.state.items.map(item => (item.types.map(type => {if(selectedTypes.indexOf(type) > -1){itemSet.add(item); return;}})));
            this.setState({filteredData: Array.from(itemSet)});
        } else {
            this.setState({filteredData: this.state.allowedData});
        }
    }

    //render function to create ui elements for location type legends and location cards.
    render() {
        const { isError, errorMsg } = this.state.dataError;
        if (isError) {
            return <div id={'errorEl'}>Error: {errorMsg}</div>;
        } else {
            //const allowedTypes = this.state.allowedTypes;
            let i=0;
            let j=0;
            return (
                <div id={'cardTemplates'}>
                    <div id={'locationTypes'}>
                        {this.getUniqueTypes().map(type => (<div key={type+(i++)} onClick={this.handleTypeSelection.bind(this)} className="categories" data-category={type}>{type}</div>))}
                    </div>
                    <div id={'locationCards'}>
                        {this.state.filteredData.map(item => (
                            <div key={'location'+(j++)} className="placeCard" data-types={item.types.join(',')}>
                                <div>
                                    {<span className='itemName label'><img src={item.icon} height='15' width='15' /> {item.name} </span>}
                                </div>
                                {item.rating ?
                                    <div>
                                        <span className='label'>Rating:</span> <span className='rating'>{this.getRatingStarts(item.rating)}</span>
                                    </div>
                                    :
                                    ''
                                }
                                <div>
                                    <span className='label'>Vicinity:</span> <span className='vicinity'>{item.vicinity}</span>
                                </div>
                                <div>
                                    <span className='label'>Tags:</span> <span className='tags'>{item.types.join(', ')}</span>{/*filter(function(at){return allowedTypes.indexOf(at)>-1;}).*/}
                                </div>
                                <div>
                                    <span className={item.opening_hours && item.opening_hours.open_now ? 'locOpen' : 'locClose'}>{item.opening_hours && item.opening_hours.open_now ? 'Open' : 'Closed Now'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    }
}

ReactDOM.render(
    <CardViewComponent/>, document.getElementById('content')
);


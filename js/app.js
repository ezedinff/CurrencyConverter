class App {
    constructor(){
        this.isLoading = false;
        this.currency = "currencies_pair_value";
        this.ListOfCurr = "currencies_list";
        this.spinner = document.querySelector(".loader");
        this.fromSelect = document.getElementById('from');
        this.fromValue = document.getElementById('fromValue');
        this.toSelect = document.getElementById('to');
        this.toValue = document.getElementById('toValue');
        this.baseURL = "https://free.currencyconverterapi.com/api/v5/";
        this.db = new Db();
        this._registerServiceWorker();
    }

    _registerServiceWorker(){
        if(!navigator.serviceWorker) return;
        navigator.serviceWorker.register('serviceworker.js').then(
            (registered) => {
                if (!navigator.serviceWorker.controller){
                    return;
                }
                if (registered.waiting){
                    this._updateReady(registered.waiting);
                    return;
                }
                if (registered.installing){
                    this._trackInstalling(registered.installing);
                    return;
                }
            }
        );

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }
    pushUpdateFound(message) {
        $('.toastr-message').html(message);
        $(".toastr").fadeIn();
    }
    _updateReady(worker) {
        this.pushUpdateFound("New version available");
        $('.dismiss-button').click(()=>{
            $(".toastr").fadeOut();
        });
        $('.refresh-button').click(()=>{
            worker.postMessage({action: 'skipWaiting'});
        });
    }
    _trackInstalling(worker){
        worker.addEventListener('statechange', function() {
            if (worker.state == 'installed') {
                this._updateReady(worker);
            }
        });
    }
    getListCurrencies() {
        this.db.loadFromStore('ListOfCurrencies', 'results').then(
            (response) => {
                const pairs = this.objectToArray(response);
                let element = '<option value="0" disabled selected>Select Currency Type</option>';
                for (let pair of pairs){
                    element += `<option value='${pair.id}'>${pair.currencyName}</option>`;
                }
                this.fromSelect.innerHTML = element;
                this.toSelect.innerHTML = element;
                $('select').material_select();
            }
        ).catch(
            (err)=> {
                console.log(err);
                fetch("https://free.currencyconverterapi.com/api/v5/currencies").then(
                    (response) => {
                        return response.json();
                    }
                ).then((data)=>{
                    const pairs = this.objectToArray(data.results);
                    let element = '<option value="0" disabled selected>Select Currency Type</option>';
                    for (let pair of pairs){
                        element += `<option value='${pair.id}'>${pair.currencyName}</option>`;
                    }
                    this.fromSelect.innerHTML = element;
                    this.toSelect.innerHTML = element;
                    $('select').material_select();
                    this.db.store('ListOfCurrencies','results',data.results);

                }).catch((err) => {
                    console.log(err);
                });
            }
        );

    }
    setCurrenciesToSelect() {
        this.getListCurrencies();
    }
    objectToArray(objects) {
        return Object.keys(objects).map(i => objects[i]);
    }
    getRate(from, to) {
        let ft = `${from}_${to}`;
        let tf = `${to}_${from}`;
        this.db.loadFromStore('currencies', ft).then(
            (response) => {
                this.from = response;
            }).catch((err)=> {
                fetch(`https://free.currencyconverterapi.com/api/v5/convert/?q=${ft},${tf}&compact=ultra`)
                    .then(
                        (response) => {
                            return response.json();
                        }
                    ).then(
                    (data) =>  {
                        this.db.store('currencies',ft,data[ft]);
                        this.db.store('currencies',tf,data[tf]);
                        localStorage.setItem(ft, data[ft]);
                        localStorage.setItem(tf, data[tf]);
                    }).catch((err) => {

                });
            });
    }

}


class Db {
    constructor() {
        this.dbname = "xConverter";
    }
    prepareDb() {
        return new Promise((resolve, reject) => {
            if (self.indexedDB) {
                let req = self.indexedDB.open(this.dbname, 1);
                if (req) {
                    req.onerror = (event) => reject(event);
                    req.onsuccess = (event) => {
                        let db = event.target.result;
                        resolve(db);
                    };
                    req.onupgradeneeded = (event) => {
                        let db = event.target.result;
                        db.createObjectStore('ListOfCurrencies');
                        db.createObjectStore('currencies');
                    };
                } else {
                    reject('IndexedDB open failed.');
                }
            } else {
                reject('IndexedDB not available.');
            }
        });
    }
    loadFromStore(storename, key){
        return new Promise((resolve, reject) => {
            if (self.indexedDB) {
                let dbPromise = this.prepareDb();
                dbPromise.then((db) => {
                    db.onerror = (event) => reject(event);
                    let get = db.transaction(storename, 'readonly').objectStore(storename).get(key);
                    get.onsuccess = (event) => {
                        if (event.target.result !== undefined) {
                            resolve(event.target.result);
                        } else {
                            reject(new Error(`Key not found: ${key}`));
                        }
                    };
                });
            } else {
                resolve(JSON.parse(localStorage.getItem(key)));
            }
        });
    }
    store(storename, key, value){
        return new Promise((resolve, reject) => {
            if (self.indexedDB) {
                let dbPromise = this.prepareDb();
                dbPromise.then((db) => {
                    db.onerror = (event) => reject(event);
                    let put = db.transaction(storename, 'readwrite')
                        .objectStore(storename).put(value, key);
                    put.onsuccess = () => resolve();
                });
            } else {
                localStorage.setItem(key, JSON.stringify(value));
                resolve();
            }
        });
    }
}

$(function () {
    $('select').material_select();
    myapp =  new App();
    myapp.toValue.value = 0;
    myapp.fromValue.value = 0;
    myapp.setCurrenciesToSelect();
    myapp.toValue.addEventListener('keyup', () => {
        let from = myapp.fromSelect.options[myapp.fromSelect.selectedIndex].value;
        let to = myapp.toSelect.options[myapp.toSelect.selectedIndex].value;
        let tf = `${to}_${from}`;
        if (from !== '0' && to !== '0'){
            myapp.getRate(to, from);
            myapp.fromValue.value = myapp.toValue.value * localStorage.getItem(tf);
        }
    });
    myapp.fromValue.addEventListener('keyup', () =>{
        let from = myapp.fromSelect.options[myapp.fromSelect.selectedIndex].value;
        let to = myapp.toSelect.options[myapp.toSelect.selectedIndex].value;
        let ft = `${from}_${to}`;
        if (from !== '' && to !== ''){
            myapp.toValue.value = localStorage.getItem(ft) * myapp.fromValue.value;
        }
    });
    $("#from").on('change', function () {
        let from = myapp.fromSelect.options[myapp.fromSelect.selectedIndex].value;
        let to = myapp.toSelect.options[myapp.toSelect.selectedIndex].value;
        let ft = `${from}_${to}`;
        if (from !== '' && to !== ''){
            myapp.toValue.value = localStorage.getItem(ft) * myapp.fromValue.value;
        }
    });
    $("#to").on('change', function () {
        let from = myapp.fromSelect.options[myapp.fromSelect.selectedIndex].value;
        let to = myapp.toSelect.options[myapp.toSelect.selectedIndex].value;
        let tf = `${to}_${from}`;
        if (from !== '0' && to !== '0'){
            myapp.getRate(to, from);
            myapp.fromValue.value = myapp.toValue.value * localStorage.getItem(tf);
        }
    });

});
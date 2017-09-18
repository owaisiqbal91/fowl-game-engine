const PersistentMode = {
    SESSION : "sessionStorage",
    LOCAL : "localStorage"
}

/**
 * Usage :
 * var persistentStorage = new PersistentStorage();
 *
 */

class PersistentStorage {

    constructor() {
        //default storage is session storage
        this.mode = PersistentMode.LOCAL;
    }

    /*
     * mandatory field
     * @mode - it changes default mode by assigning it to 'this' object
     */
    setMode(mode) {
        this.mode = mode;
    }

    /*
     * this method is for deciding fallback if mode is not passed in the function
     * it is internally called before persisting/retrieving values from the storage
     */
    checkMode(mode) {
        if (!mode) {
            mode = this.mode
        }
        return mode;
    }

    /*
     * saves a key value pair in either session storage or local storage based on mode passed or set in object definition
     *
     * mandatory fields
     * @key
     * @value
     *
     * optional field
     * @mode - on passing into method forces function to use that mode
     *		 - it doesn't change default mode assigned to object
     *		 - if not passed, default/set mode is used
     */
    persist(key, value, mode) {
        //mode can be enforced by passing 3rd argument
        mode = this.checkMode(mode);
        var stringifiedValue = JSON.stringify(value);
        window[mode].setItem(key, stringifiedValue);
    }

    /*
     * retrieves the saved value for the key from the persistent storage specified by mode
     * passed in function call or from object definition
     *
     * mandatory fields
     * @key
     *
     * optional field
     * @mode - on passing into method forces function to use that mode
     *		 - it doesn't change default mode assigned to object
     *		 - if not passed, default/set mode is used
     *
     * returns false if key is not found in the storage
     * returns value for the key if found
     */
    get(key, mode) {
        //mode can be enforced by passing 2nd argument
        mode = this.checkMode(mode);
        var object = window[mode].getItem(key);
        if (object) {
            return JSON.parse(object);
        }
        //return false when value for key doesn't exist
        return false;
    }

    /*
     * removes the key value pair from the persistent storage specified by mode
     * passed in function call or from object definition
     *
     * mandatory fields
     * @key
     *
     * optional field
     * @mode - on passing into method forces function to use that mode
     *		 - it doesn't change default mode assigned to object
     *		 - if not passed, default/set mode is used
     */
    remove(key, mode) {
        //remove entry from storage
        mode = this.checkMode(mode);
        window[mode].removeItem(key);
    }

    /*
     * clears the persistent storage specified by mode
     * passed in function call or from object definition
     *
     * optional field
     * @mode - on passing into method forces function to use that mode
     *		 - it doesn't change default mode assigned to object
     *		 - if not passed, default/set mode is used
     */
    clear(mode) {
        //clear storage
        mode = this.checkMode(mode);
        window[mode].clear();
    }
}
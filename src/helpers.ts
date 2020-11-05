
/*
 * Shuffle array
 * @function shuffle
 * @param {array} a: array to be shuffled
 */
export function shuffle(a : any[]) : any[] {
    var j : number, x : number, i : number;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}


/**
 * Pad number with leading zeros upto length. Return String
 * @function pad_with_zeroes
 * @param {number} number
 * @param {number} length: length result of zero-padding number number
 */
export function pad_with_zeroes(number : (number|string), 
                         length : number) : string {
    var my_string = '' + number;
    while (my_string.length < length) {
        my_string = '0' + my_string;
    }
    return my_string;
}


/**
 * Removes item from array if present
 * @function remove_item
 * @param {array} array
 * @param {any} item
 */
export function remove_item(array : any[], item : any) {
    let index = array.indexOf(item);
    if (index > -1) {
      array.splice(index, 1);
    }
    return array
}


export function lookForParent(element : HTMLElement, 
                             target_class : string) : HTMLElement {

    let el = element;
    let name = el.nodeName;
    let cl = el.className;
    while (name && name != "HTML") {
        if (cl == target_class) {
            return el;
        }
        el = el.parentElement;
        name = el.nodeName;
        cl = el.className;
    }
    return undefined;
}

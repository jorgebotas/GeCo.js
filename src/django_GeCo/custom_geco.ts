async function custom_geco(selector : string) {
    var colors_file = "/static/geco/txt/colors.txt";
    var colors : string[];
    await fetch(colors_file)
        .then(response => response.text())
        .then(hex => colors = eval(hex))
    var urlPath = window.location.pathname.split("/");
    let uploaded_url : string = String(urlPath[2]).replaceAll(",", "/");
    let inputfile : JSON;
    await fetch(uploaded_url)
        .then(response => response.text())
        .then(txt => inputfile = JSON.parse(txt))
    let newick : string;
    // GET NEWICK IF PROVIDED IN URL...
    await window.launch_GeCo(selector,
                             inputfile, 
                             newick,
                             41, 
                             colors);
    d3.select('ul.navbar')
        .style('visibility', 'visible')
        .style('opacity', 1);
}


custom_geco("body")

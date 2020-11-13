import { select } from 'd3';


const API_URL : string = "/eggnog/api/"

async function get_context(query : string) {
    var url_path : string = API_URL + "getcontext/" + query + "/";
    let data : any;
    $('.loader').show();
    data = await $.ajax({
      url: url_path,
      complete: function(){
        $('.loader').hide();
      },
      error: function() {
          $('.loader').hide();
          alert("Incorrect cluster identifier")
      }
    })
    return data;
}

async function get_newick(url : string) {
    var newick= await $.ajax({
      url: url,
      error: function() {
          console.log("No tree found")
      }
    })
    return newick
}


async function launch_analysis(selector : string,
                        query : string,
                        nenv : number) {
    var colors_file = "/static/geco/txt/colors.txt";
    var colors : string[];
    await fetch(colors_file)
        .then(response => response.text())
        .then(hex => colors = eval(hex))
    // ASYNC CALL TO MONGO SERVER
    var data : JSON = await get_context(query);
    // Get tree in Newick format
    var newick : string;
    try {
        let newick_url = API_URL + "tree/" + query + "/";
        newick = await get_newick(newick_url);

    } catch { newick = undefined; }
    // Launch GeCo which is a window global from geco.js
    window.launch_GeCo(selector,
                   data,
                   newick,
                   nenv,
                   colors)
}

async function eggnog_geco(selector : string) {
    var nenv : number = 41;
    var urlPath : string[] = window.location.pathname.split("/");
    var query : string = urlPath[3];
    await launch_analysis(selector, query, nenv)
    select('ul.navbar')
        .style('visibility', 'visible')
        .style('opacity', 1);
}


eggnog_geco("body");

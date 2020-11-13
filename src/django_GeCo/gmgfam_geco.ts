
async function get_context(query : string,
                        isCluster : boolean,
                        cutoff : string|number,
                        url? : string) {
    var url_root : string = "/gmgfam/getcontext/";
    if (isCluster) {
        url_root += "cluster/";
    } else {
        url_root += "unigene/"
    }
    let data : any;
    var url_path : string;
    if (url) {
        url_path = url;
    } else {
        url_path  = url_root + query + "/" + cutoff;
    }
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
                        isCluster : boolean,
                        cutoff : number, 
                        nenv : number,
                        queryList? : string[]) {
    var colors_file = "/static/geco/txt/colors.txt";
    var colors : string[];
    await fetch(colors_file)
        .then(response => response.text())
        .then(hex => colors = eval(hex))
    // ASYNC CALL TO MONGO SERVER
    var data : JSON;
     if(queryList){
        let url = '/getcontext/list/' + queryList.join(",") + "/" + cutoff;
        data = await get_context(query, isCluster, cutoff, url);

    } else {
        data = await get_context(query, isCluster, cutoff);
    }
    // Get tree in Newick format
    var newick : string;
    try {
        let newick_url = "/gmgfam/tree/" + query + "/";
        newick = await get_newick(newick_url);

    } catch { newick = undefined; }
    // Launch GeCo which is a window global from geco.js
    window.launch_GeCo(selector,
                   data,
                   newick,
                   nenv,
                   colors)
}

async function gmgfam_geco(selector : string) {
    var nenv : number = 41;
    var urlPath : string[] = window.location.pathname.split("/");
    var context : string = urlPath[2]
    var query : string = urlPath[3];
    var cutoff : number = +urlPath[4];
    if (context == "clustercontext") {
        await launch_analysis(selector, query, true, cutoff, nenv);
    } else if (context == "unigenecontext") {
        await launch_analysis(selector, query, false, cutoff, nenv);
    } else if (context == "listcontext"){
        let genelist : string[] = String(urlPath[3]).split(",");
        await launch_analysis(selector,
                        undefined, 
                        false,
                        cutoff,
                        nenv,
                        genelist)
    } 
    select('ul.navbar')
        .style('visibility', 'visible')
        .style('opacity', 1);
}

gmgfam_geco("body");

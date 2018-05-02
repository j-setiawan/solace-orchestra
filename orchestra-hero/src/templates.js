import jst from '../../common/jayesstee';
import env from '../../common/env';

// Add HTML elements to global namespace
jst.makeGlobal();

let templates;

let formatters = {


};


export default templates = {

  page:   (score) =>
    $div(
      templates.dialog(),
      $div(
        $img({cn: "heading", height: "48px", width: "225px", src: "assets/solaceSymphonyInverted.png"}),
        $div(
          {cn: "outermost"},
          $div(
            {cn: "outer1"},
            $div(
              {id: "lines"},
              [...Array(7).keys()].map(num => $div({cn: `line line${num+1}`}))
            ),
            $div(
              {id: "sliders"}
            )
          ),
          
          $div(
            {id: "buttons", cn: "hide"},
            [...Array(7).keys()].map(num => $button({cn: `my-button button${num+1} color${num+1}`, id: `button${num+1}`}))
          ),
          $div(
            {id: "score"},
            jst.stamp("score", templates.scoreTable, score) 
          )
        )
      )
    ),

  dialog:  () =>
    $div(
      {cn:"modal fade", id:"getNameModal", tabindex:"-1", role:"dialog", "aria-labelledby":"exampleModalLabel", "aria-hidden":"true"},
      $div(
        {cn:"modal-dialog modal-sm", role:"document"},
        $div(
          {cn:"modal-content"},
          $div(
            {cn:"modal-body"},
            $div(
              {cn:"form-group"},
              $label(
                {for:"recipient-name", cn:"col-form-label"},
                "Name:"
              ),
              $input(
                {type:"text", cn:"form-control", id:"musician-name"}
              )
            )        
          )        
        )        
        
      )   
    ),

  scoreTable: (score) =>
    $table(
      $tr(
        $th("Hits"),
        $td(score.hits)
      ),
      $tr(
        $th("Misses"),
        $td(score.misses)
      )
    )

};
